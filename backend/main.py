from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from moviepy import editor
import moviepy
import os
import traceback

app = FastAPI()


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post("/edit_video/")
async def edit_video(
        file: UploadFile = File(...),
        start_time: float = Form(0),
        end_time: float = Form(0),
        action: str = Form('trim'),
        brightness_factor: float = Form(1.0),
        speed_factor: float = Form(1.0),
        output_format: str = Form('mp4')
):
    try:
        os.makedirs("/tmp", exist_ok=True)

        import uuid
        unique_id = str(uuid.uuid4())
        input_path = f"/tmp/input_{unique_id}.{file.filename.split('.')[-1]}"
        output_path = f"/tmp/edited_{unique_id}.{output_format}"

        with open(input_path, "wb") as buffer:
            buffer.write(await file.read())

        video = editor.VideoFileClip(input_path)

        start_time = max(0, start_time)
        end_time = min(end_time, video.duration) if end_time > 0 else video.duration

        if action == 'trim':
            left_segment = video.subclip(0, start_time)
            right_segment = video.subclip(end_time, video.duration)
            final_video = editor.concatenate_videoclips([left_segment, right_segment])
        elif action == 'brighten':
            final_video = video.fx(moviepy.video.fx.all.colorx, brightness_factor)
        elif action == 'darken':
            final_video = video.fx(moviepy.video.fx.all.colorx, 1/brightness_factor)
        elif action == 'speedup':
            final_video = moviepy.video.fx.all.speedx(video, factor=speed_factor)
        elif action == 'slowdown':
            final_video = moviepy.video.fx.all.speedx(video, factor=(1 / speed_factor))
        else:
            final_video = video

        final_video.write_videofile(
            output_path,
            codec='libx264',
            fps=video.fps,
            logger=None  # Suppress logging
        )

        # Close video clips to free up resources
        video.close()
        final_video.close()

        # Return the edited video
        response = FileResponse(
            output_path,
            media_type=f"video/{output_format}",
            filename=f"edited_video.{output_format}"
        )

        @response.background_task
        def cleanup():
            try:
                os.unlink(input_path)
                os.unlink(output_path)
            except Exception:
                pass

        return response

    except Exception as e:
        print(f"Error processing video: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Video processing error: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)