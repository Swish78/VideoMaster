from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import cv2
import os
import uuid
import numpy as np
import traceback
from mangum import Mangum

app = FastAPI(title='VideoMaster')
handler = Mangum(app)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)


@app.get("/")
async def root():
    return {"message": "Hello World"}


@app.post("/edit_video/")
async def edit_video(
        file: UploadFile = File(...),
        start_time: float = Form(0),
        end_time: float = Form(0),
        action: str = Form('trim'),
        brightness_factor: float = Form(1.0),
        speed_factor: float = Form(1.0),
        overlay_text: str = Form(None),
        output_format: str = Form('mp4'),
        width: int = Form(None),
        height: int = Form(None),
        crop_x: int = Form(None),
        crop_y: int = Form(None),
        crop_width: int = Form(None),
        crop_height: int = Form(None)
):
    try:
        os.makedirs("/tmp", exist_ok=True)

        unique_id = str(uuid.uuid4())
        input_path = f"/tmp/input_{unique_id}.{file.filename.split('.')[-1]}"
        output_path = f"/tmp/edited_{unique_id}.{output_format}"

        with open(input_path, "wb") as buffer:
            buffer.write(await file.read())

        cap = cv2.VideoCapture(input_path)
        if not cap.isOpened():
            raise HTTPException(status_code=400, detail="Failed to open video file")

        original_fps = int(cap.get(cv2.CAP_PROP_FPS))
        original_width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        original_height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

        # Determine crop parameters
        if crop_x is None: crop_x = 0
        if crop_y is None: crop_y = 0
        if crop_width is None: crop_width = original_width - crop_x
        if crop_height is None: crop_height = original_height - crop_y

        # Validate crop parameters
        if (crop_x < 0 or crop_y < 0 or
            crop_x + crop_width > original_width or
            crop_y + crop_height > original_height):
            raise HTTPException(status_code=400, detail="Invalid crop parameters")

        # Determine output dimensions and FPS
        width = width or crop_width
        height = height or crop_height
        output_fps = int(original_fps * abs(speed_factor))

        # Video writer setup
        fourcc = cv2.VideoWriter_fourcc(*'mp4v')
        out = cv2.VideoWriter(output_path, fourcc, output_fps, (width, height))

        # Frame processing parameters
        start_frame = int(start_time * original_fps)
        end_frame = int(end_time * original_fps) if end_time > 0 else frame_count

        frames = []
        frame_index = 0
        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break

            if start_frame <= frame_index <= end_frame:
                # Crop frame
                cropped_frame = frame[crop_y:crop_y+crop_height, crop_x:crop_x+crop_width]

                # Apply various actions
                if action == 'brighten':
                    cropped_frame = cv2.convertScaleAbs(cropped_frame, alpha=brightness_factor, beta=0)
                elif action == 'darken':
                    cropped_frame = cv2.convertScaleAbs(cropped_frame, alpha=1 / brightness_factor, beta=0)
                elif action == 'overlay_text' and overlay_text:
                    cv2.putText(
                        cropped_frame, overlay_text, (50, 50),
                        cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 255), 2, cv2.LINE_AA
                    )
                elif action == 'apply_grayscale':
                    cropped_frame = cv2.cvtColor(cropped_frame, cv2.COLOR_BGR2GRAY)
                    cropped_frame = cv2.cvtColor(cropped_frame, cv2.COLOR_GRAY2BGR)
                elif action == 'apply_sepia':
                    cropped_frame = cv2.transform(cropped_frame, np.array([[0.272, 0.534, 0.131],
                                                                           [0.349, 0.686, 0.168],
                                                                           [0.393, 0.769, 0.189]]))
                elif action == 'negative':
                    cropped_frame = cv2.bitwise_not(cropped_frame)

                cropped_frame = cv2.resize(cropped_frame, (width, height))

                if speed_factor > 0:
                    # Forward playback: select frames based on speed
                    if frame_index % max(1, int(1/speed_factor)) == 0:
                        frames.append(cropped_frame)
                else:
                    # Reverse playback
                    frames.insert(0, cropped_frame)

            frame_index += 1

        cap.release()

        # Write frames to output video
        for frame in frames:
            out.write(frame)

        out.release()

        return FileResponse(
            output_path,
            media_type=f"video/{output_format}",
            filename=f"edited_video.{output_format}"
        )

    except Exception as e:
        print(f"Error processing video: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Video processing error: {str(e)}")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)