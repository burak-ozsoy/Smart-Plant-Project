import cv2
import asyncio
import time
import uvicorn
from picamera2 import Picamera2
from fastapi import FastAPI, WebSocket , WebSocketDisconnect

class Camera_Server:

    def __init__(self):
        self.tag = "[camera.py]"
        self.app = FastAPI()
        self._target_fps = 20
        self._jpeg_qual = 70
        camera_info = Picamera2.global_camera_info()
        if not camera_info:
            raise RuntimeError(
                f"{self.tag}: No CSI camera detected by libcamera/Picamera2. "
                "Check cable/enable camera and run 'rpicam-hello --list-cameras'."
            )

        self.__pi_cam2 = Picamera2(0)
        self.__config = None

        self.config()
        self.route()


    def config(self):
        if self.__config is None:
            self.__config = self.__pi_cam2.create_video_configuration(main={"size": (640, 480), "format": "RGB888"})
    
        self.__pi_cam2.configure(self.__config)
        self.__pi_cam2.start()
    
    def route(self):
    
        @self.app.websocket("/ws/camera")
        async def camera_stream(websocket: WebSocket):
            await websocket.accept()
            print(f"{self.tag}: Client connected")

            frame_delay = 1 / self._target_fps
            try:
                while True:
                    start_time = time.perf_counter()

                    frame = self.__pi_cam2.capture_array()

                    success, encoded_frame = cv2.imencode(".jpg", frame, [int(cv2.IMWRITE_JPEG_QUALITY), self._jpeg_qual])

                    if success:
                        await websocket.send_bytes(encoded_frame.tobytes())

                    elapsed_time = time.perf_counter() - start_time
                    sleep_time = max(0, frame_delay - elapsed_time)
                    await asyncio.sleep(sleep_time)
            except WebSocketDisconnect:
                print(f"{self.tag}: Client disconnected")

if __name__ == "__main__":
    try:
        server = Camera_Server()
        uvicorn.run(server.app, host="0.0.0.0", port=8000)
    except Exception as e:
        print(f"[camera.py]: Startup failed - {e}")