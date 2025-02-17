from fastapi import FastAPI, File, UploadFile, Form, HTTPException, BackgroundTasks
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import cv2
import os
import uuid
import numpy as np
import traceback
from mangum import Mangum
import psutil
import time
from typing import Dict, Literal

app = FastAPI(title='VideoMaster')
handler = Mangum(app)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

BATCH_SIZE = 30
active_jobs: Dict[str, Dict] = {}

VIDEO_FORMATS = {
    'mp4': {'fourcc': 'mp4v', 'ext': 'mp4', 'mime': 'video/mp4'},
    'avi': {'fourcc': 'XVID', 'ext': 'avi', 'mime': 'video/x-msvideo'},
    'mov': {'fourcc': 'mp4v', 'ext': 'mov', 'mime': 'video/quicktime'}
}


@app.get("/")
async def root():
    return {"message": "Hello World"}


def apply_color_effect(frame, effect_type, intensity=1.0):
    if effect_type == 'sepia':
        sepia_matrix = np.array([[0.272, 0.534, 0.131],
                              [0.349, 0.686, 0.168],
                              [0.393, 0.769, 0.189]]) * intensity
        return cv2.transform(frame, sepia_matrix)
    elif effect_type == 'cool':
        frame = frame.astype(float)
        frame[:,:,0] = frame[:,:,0] * min(1.0 + intensity * 0.2, 2.0)  # Boost blue
        frame[:,:,1] = frame[:,:,1]  # Keep green
        frame[:,:,2] = frame[:,:,2] * max(1.0 - intensity * 0.2, 0.0)  # Reduce red
        return np.clip(frame, 0, 255).astype(np.uint8)
    elif effect_type == 'warm':
        frame = frame.astype(float)
        frame[:,:,0] = frame[:,:,0] * max(1.0 - intensity * 0.2, 0.0)  # Reduce blue
        frame[:,:,1] = frame[:,:,1]  # Keep green
        frame[:,:,2] = frame[:,:,2] * min(1.0 + intensity * 0.2, 2.0)  # Boost red
        return np.clip(frame, 0, 255).astype(np.uint8)
    return frame

def apply_blur_effect(frame, effect_type, intensity=1.0):
    kernel_size = max(1, int(intensity * 10)) * 2 + 1
    if effect_type == 'gaussian':
        return cv2.GaussianBlur(frame, (kernel_size, kernel_size), 0)
    elif effect_type == 'motion':
        kernel = np.zeros((kernel_size, kernel_size))
        kernel[int((kernel_size-1)/2), :] = np.ones(kernel_size)
        kernel = kernel / kernel_size
        return cv2.filter2D(frame, -1, kernel)
    elif effect_type == 'radial':
        center = (frame.shape[1] // 2, frame.shape[0] // 2)
        blurred = cv2.GaussianBlur(frame, (kernel_size, kernel_size), 0)
        mask = np.zeros(frame.shape[:2], dtype=np.float32)
        cv2.circle(mask, center, min(center), 1.0, -1)
        mask = cv2.GaussianBlur(mask, (kernel_size*2+1, kernel_size*2+1), 0)
        return cv2.convertScaleAbs(frame * mask[..., None] + blurred * (1 - mask)[..., None])
    return frame

def apply_text_overlay(frame, text, position='center', font_scale=1.0, color=(255, 255, 255), thickness=2):
    height, width = frame.shape[:2]
    font = cv2.FONT_HERSHEY_SIMPLEX
    text_size = cv2.getTextSize(text, font, font_scale, thickness)[0]
    
    if position == 'center':
        x = (width - text_size[0]) // 2
        y = (height + text_size[1]) // 2
    elif position == 'top':
        x = (width - text_size[0]) // 2
        y = text_size[1] + 10
    elif position == 'bottom':
        x = (width - text_size[0]) // 2
        y = height - 10
    else:  # Custom position as tuple (x, y)
        x, y = position
    
    # Add text shadow/outline for better visibility
    shadow_color = (0, 0, 0)
    for dx, dy in [(-1,-1), (-1,1), (1,-1), (1,1)]:
        cv2.putText(frame, text, (x+dx, y+dy), font, font_scale, shadow_color, thickness+1, cv2.LINE_AA)
    cv2.putText(frame, text, (x, y), font, font_scale, color, thickness, cv2.LINE_AA)
    return frame

def apply_brightness_adjustment(frame, brightness_factor=1.0, gamma=1.0, preserve_colors=False):
    # Convert to float for better precision
    frame_float = frame.astype(float)
    
    if preserve_colors:
        # Convert to HSV to preserve color ratios
        hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV).astype(float)
        # Adjust only the V channel
        hsv[:,:,2] = np.clip(hsv[:,:,2] * brightness_factor, 0, 255)
        # Apply gamma correction to V channel
        hsv[:,:,2] = np.power(hsv[:,:,2] / 255.0, gamma) * 255.0
        # Convert back to BGR
        adjusted = cv2.cvtColor(hsv.astype(np.uint8), cv2.COLOR_HSV2BGR)
    else:
        # Direct brightness adjustment
        frame_float = np.clip(frame_float * brightness_factor, 0, 255)
        # Gamma correction
        frame_float = np.power(frame_float / 255.0, gamma) * 255.0
        adjusted = frame_float.astype(np.uint8)
    
    return adjusted

def apply_speed_effect(frames, speed_factor, interpolation_method='linear'):
    if speed_factor == 1.0:
        return frames
    
    num_frames = len(frames)
    if num_frames < 2:
        return frames
        
    if speed_factor > 1.0:  # Speed up
        # Calculate new frame indices
        indices = np.arange(0, num_frames, speed_factor)
        indices = indices[indices < num_frames].astype(int)
        return [frames[i] for i in indices]
    else:  # Slow down
        new_num_frames = int(num_frames / speed_factor)
        if interpolation_method == 'linear':
            # Linear interpolation between frames
            new_frames = []
            for i in range(new_num_frames):
                orig_idx = i * speed_factor
                idx1 = int(orig_idx)
                idx2 = min(idx1 + 1, num_frames - 1)
                alpha = orig_idx - idx1
                
                frame1 = frames[idx1].astype(float)
                frame2 = frames[idx2].astype(float)
                interpolated = cv2.addWeighted(frame1, 1 - alpha, frame2, alpha, 0)
                new_frames.append(interpolated.astype(np.uint8))
            return new_frames
        else:  # Simple frame duplication
            indices = np.clip(np.arange(0, num_frames, speed_factor), 0, num_frames - 1).astype(int)
            return [frames[i] for i in indices]

def process_video_batch(frames, action, params):
    processed_frames = []
    
    # Handle speed and reverse effects first as they affect the entire batch
    if action == 'speed':
        speed_factor = float(params.get('speed_factor', 1.0))
        interpolation = params.get('speed_interpolation', 'linear')
        return apply_speed_effect(frames, speed_factor, interpolation)
    elif action == 'reverse':
        return frames[::-1]
    
    # Process frame by frame for other effects
    for frame in frames:
        # Enhanced brightness and darkness controls
        if action in ['brighten', 'darken']:
            brightness_factor = float(params.get('brightness_factor', 1.0))
            if action == 'darken':
                brightness_factor = 1.0 / brightness_factor
            
            gamma = float(params.get('gamma', 1.0))
            preserve_colors = params.get('preserve_colors', False)
            frame = apply_brightness_adjustment(frame, brightness_factor, gamma, preserve_colors)
        
        # Color effects
        elif action == 'sepia':
            frame = apply_color_effect(frame, 'sepia', float(params.get('effect_intensity', 1.0)))
        elif action == 'cool':
            frame = apply_color_effect(frame, 'cool', float(params.get('effect_intensity', 1.0)))
        elif action == 'warm':
            frame = apply_color_effect(frame, 'warm', float(params.get('effect_intensity', 1.0)))
        elif action == 'grayscale':
            frame = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            frame = cv2.cvtColor(frame, cv2.COLOR_GRAY2BGR)
        elif action == 'negative':
            frame = cv2.bitwise_not(frame)
        
        # Blur effects
        elif action == 'gaussian_blur':
            frame = apply_blur_effect(frame, 'gaussian', float(params.get('blur_intensity', 1.0)))
        elif action == 'motion_blur':
            frame = apply_blur_effect(frame, 'motion', float(params.get('blur_intensity', 1.0)))
        elif action == 'radial_blur':
            frame = apply_blur_effect(frame, 'radial', float(params.get('blur_intensity', 1.0)))
        
        # Text overlay with enhanced options
        elif action == 'overlay_text' and params.get('overlay_text'):
            position = params.get('text_position', 'center')
            if isinstance(position, str) and ',' in position:
                position = tuple(map(int, position.split(',')))
            frame = apply_text_overlay(
                frame,
                str(params['overlay_text']),
                position=position,
                font_scale=float(params.get('font_scale', 1.0)),
                color=tuple(map(int, params.get('text_color', '255,255,255').split(','))),
                thickness=int(params.get('text_thickness', 2))
            )
        
        processed_frames.append(frame)
    return processed_frames

def cleanup_job_files(job_id: str):
    try:
        # Clean up input file
        input_pattern = f"/tmp/input_{job_id}.*"
        for f in os.listdir("/tmp"):
            if f.startswith(f"input_{job_id}"):
                os.remove(os.path.join("/tmp", f))
        
        # Clean up output file if job failed
        if job_id in active_jobs and active_jobs[job_id]['status'] == 'failed':
            output_pattern = f"/tmp/edited_{job_id}.*"
            for f in os.listdir("/tmp"):
                if f.startswith(f"edited_{job_id}"):
                    os.remove(os.path.join("/tmp", f))
    except Exception as e:
        print(f"Error cleaning up files for job {job_id}: {str(e)}")

async def process_video_async(job_id: str, input_path: str, output_path: str, params: dict):
    try:
        active_jobs[job_id]['status'] = 'processing'
        
        # Extract parameters with defaults
        speed_factor = float(params.get('speed_factor', 1.0))
        brightness_factor = float(params.get('brightness_factor', 1.0))
        gamma = float(params.get('gamma', 1.0))
        preserve_colors = bool(params.get('preserve_colors', False))
        overlay_text = params.get('overlay_text', '')
        text_position = params.get('text_position', 'center')
        font_scale = float(params.get('font_scale', 1.0))
        text_color = params.get('text_color', '255,255,255')
        text_thickness = int(params.get('text_thickness', 2))
        effect_intensity = float(params.get('effect_intensity', 1.0))
        blur_intensity = float(params.get('blur_intensity', 1.0))
        
        cap = cv2.VideoCapture(input_path)
        if not cap.isOpened():
            raise Exception("Failed to open video file")
            
        fps = cap.get(cv2.CAP_PROP_FPS)
        original_width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        original_height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        
        # Get format configuration
        output_format = params.get('output_format', 'mp4').lower()
        if output_format not in VIDEO_FORMATS:
            raise Exception(f"Unsupported output format: {output_format}")
        
        format_config = VIDEO_FORMATS[output_format]
        
        # Set dimensions with defaults
        width = int(params.get('width', original_width)) if params.get('width') else original_width
        height = int(params.get('height', original_height)) if params.get('height') else original_height
        
        # Validate dimensions
        if width <= 0 or height <= 0:
            raise Exception("Invalid dimensions: width and height must be positive")
            
        # Validate speed factor
        if speed_factor == 0:
            raise Exception("Speed factor cannot be zero")
        
        fourcc = cv2.VideoWriter_fourcc(*format_config['fourcc'])
        out = cv2.VideoWriter(output_path, fourcc, fps * abs(speed_factor), (width, height))
        if not out.isOpened():
            raise Exception(f"Failed to create output video file with format {output_format}")
        
        frames_buffer = []
        frame_index = 0
        start_frame = max(0, int(float(params['start_time']) * fps))
        end_frame = min(frame_count, int(float(params['end_time']) * fps) if float(params['end_time']) > 0 else frame_count)
        
        if start_frame >= end_frame:
            raise Exception("Invalid time range: start time must be less than end time")
        
        try:
            while cap.isOpened():
                ret, frame = cap.read()
                if not ret:
                    break
                    
                if start_frame <= frame_index <= end_frame:
                    # Crop frame
                    crop_x = int(params.get('crop_x', 0))
                    crop_y = int(params.get('crop_y', 0))
                    crop_width = int(params.get('crop_width', original_width)) if params.get('crop_width') is not None else original_width
                    crop_height = int(params.get('crop_height', original_height)) if params.get('crop_height') is not None else original_height
                    frame = frame[crop_y:crop_y+crop_height, crop_x:crop_x+crop_width]
                    frame = cv2.resize(frame, (width, height))
                    
                    if speed_factor > 0:
                        if frame_index % max(1, int(1/speed_factor)) == 0:
                            frames_buffer.append(frame)
                    else:
                        frames_buffer.insert(0, frame)
                    
                    if len(frames_buffer) >= BATCH_SIZE:
                        processed_frames = process_video_batch(frames_buffer, params['action'], params)
                        for f in processed_frames:
                            out.write(f)
                        frames_buffer.clear()  # Use clear() instead of reassignment
                        
                    active_jobs[job_id]['progress'] = min(100, int((frame_index - start_frame) * 100 / (end_frame - start_frame)))
                
                frame_index += 1
            
            if frames_buffer:
                processed_frames = process_video_batch(frames_buffer, params['action'], params)
                for f in processed_frames:
                    out.write(f)
                frames_buffer.clear()
            
        finally:
            cap.release()
            out.release()
            
        if frame_index == 0:
            raise Exception("No frames were processed")
            
        active_jobs[job_id]['status'] = 'completed'
        active_jobs[job_id]['output_path'] = output_path
        
    except Exception as e:
        print(f"Error in process_video_async: {str(e)}")
        print(traceback.format_exc())
        active_jobs[job_id]['status'] = 'failed'
        active_jobs[job_id]['error'] = str(e)
    finally:
        cleanup_job_files(job_id)

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "memory_usage": psutil.Process().memory_percent(),
        "cpu_usage": psutil.cpu_percent(),
        "active_jobs": len(active_jobs),
        "uptime": time.time() - psutil.boot_time()
    }

@app.get("/job/{job_id}")
async def get_job_status(job_id: str):
    if job_id not in active_jobs:
        raise HTTPException(status_code=404, detail="Job not found")
    return active_jobs[job_id]

@app.get("/job/{job_id}/download")
async def download_video(job_id: str):
    if job_id not in active_jobs:
        raise HTTPException(status_code=404, detail="Job not found")
    
    job = active_jobs[job_id]
    if job['status'] != 'completed':
        raise HTTPException(status_code=400, detail=f"Job is not completed. Current status: {job['status']}")
    
    try:
        response = FileResponse(
            job['output_path'],
            media_type=f"video/{job['params']['output_format']}",
            filename=f"edited_video.{job['params']['output_format']}"
        )
        # Schedule cleanup after successful download
        cleanup_job_files(job_id)
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error accessing video file: {str(e)}")

@app.post("/edit_video/")
async def edit_video(
        background_tasks: BackgroundTasks,
        file: UploadFile = File(...),
        start_time: float = Form(0),
        end_time: float = Form(0),
        action: str = Form('trim'),
        output_format: Literal['mp4', 'avi', 'mov'] = Form('mp4'),
        brightness_factor: float = Form(1.0),
        speed_factor: float = Form(1.0),
        gamma: float = Form(1.0),
        preserve_colors: bool = Form(False),
        speed_interpolation: str = Form('linear'),
        overlay_text: str = Form(None),
        width: int = Form(None),
        height: int = Form(None),
        crop_x: int = Form(0),
        crop_y: int = Form(0),
        crop_width: int = Form(None),
        crop_height: int = Form(None),
        effect_intensity: float = Form(1.0),
        blur_intensity: float = Form(1.0),
        contrast_factor: float = Form(1.0),
        text_position: str = Form('center'),
        font_scale: float = Form(1.0),
        text_color: str = Form('255,255,255'),
        text_thickness: int = Form(2)
):
    try:
        os.makedirs("/tmp", exist_ok=True)
        job_id = str(uuid.uuid4())
        
        # Validate output format
        output_format = output_format.lower()
        if output_format not in VIDEO_FORMATS:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported output format. Supported formats are: {', '.join(VIDEO_FORMATS.keys())}"
            )
        
        input_path = f"/tmp/input_{job_id}.{file.filename.split('.')[-1]}"
        output_path = f"/tmp/edited_{job_id}.{VIDEO_FORMATS[output_format]['ext']}"
        
        with open(input_path, "wb") as buffer:
            buffer.write(await file.read())
            
        params = {
            'action': action,
            'start_time': start_time,
            'end_time': end_time,
            'output_format': output_format,
            'brightness_factor': brightness_factor,
            'speed_factor': speed_factor,
            'gamma': gamma,
            'preserve_colors': preserve_colors,
            'speed_interpolation': speed_interpolation,
            'overlay_text': overlay_text,
            'output_format': output_format,
            'width': width,
            'height': height,
            'crop_x': crop_x or 0,
            'crop_y': crop_y or 0,
            'crop_width': crop_width,
            'crop_height': crop_height,
            'effect_intensity': effect_intensity,
            'blur_intensity': blur_intensity,
            'contrast_factor': contrast_factor,
            'text_position': text_position,
            'font_scale': font_scale,
            'text_color': text_color,
            'text_thickness': text_thickness
        }
        
        active_jobs[job_id] = {
            'status': 'pending',
            'progress': 0,
            'params': params,
            'input_path': input_path,
            'output_path': output_path
        }
        
        background_tasks.add_task(process_video_async, job_id, input_path, output_path, params)
        
        return {"job_id": job_id}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/job/{job_id}/download")
async def download_video(job_id: str):
    if job_id not in active_jobs:
        raise HTTPException(status_code=404, detail="Job not found")
    
    job = active_jobs[job_id]
    if job['status'] != 'completed':
        raise HTTPException(status_code=400, detail=f"Job is not completed. Current status: {job['status']}")
    
    try:
        output_format = job['params']['output_format']
        format_config = VIDEO_FORMATS[output_format]
        
        response = FileResponse(
            job['output_path'],
            media_type=format_config['mime'],
            filename=f"edited_video.{format_config['ext']}"
        )
        # Schedule cleanup after successful download
        cleanup_job_files(job_id)
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error accessing video file: {str(e)}")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)