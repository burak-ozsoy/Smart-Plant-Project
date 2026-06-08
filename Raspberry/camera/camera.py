import cv2
import numpy as np
import os
import time
from Raspberry.firebase.send_to_firebase import FirebaseClient

class Camera:

    def __init__(self):

        self.tag = "[camera.py]"
        self.root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        os.makedirs(os.path.join(self.root_dir, "images"), exist_ok=True)
        self.img_dir = os.path.join(self.root_dir, "images")
        self.firebase = FirebaseClient()
        self.prev_area: float | None = None
        self.prev_center: tuple | None = None

    def calc_laplacian_variance(self, img, thres=100.0) -> tuple:

        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        blur = cv2.Laplacian(gray, cv2.CV_64F).var()
        return blur > thres , blur
    
    def plant_masking_and_contour(self, img) -> tuple:

        hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
        green_mask = cv2.inRange(hsv,
                                 np.array([35, 40, 40]),
                                 np.array([85, 255, 255]))
        
        yellow_mask = cv2.inRange(hsv,
                                  np.array([15, 40, 40]),
                                  np.array([34, 255, 255]))
        
        plant_mask = cv2.bitwise_or(green_mask, yellow_mask)
        
        kernel = np.ones((5, 5), np.uint8)
        plant_mask = cv2.morphologyEx(plant_mask, cv2.MORPH_CLOSE, kernel)
        contours , _ = cv2.findContours(plant_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

        return green_mask , yellow_mask , contours
    
    def analysis(self, prev_area, prev_center, pixel_ratio=0.1, display=True) -> dict | None:
        data = dict()
        img = cv2.imread(os.path.join(self.img_dir, "latest_img.jpg"))
        if img is None:
            print(f"{self.tag}: Unable to read image from {self.img_dir}")
            return None
        
        is_good_quality , quality_score = self.calc_laplacian_variance(img)
        print(f"Laplacian variance is {quality_score:.2f}")
        if not is_good_quality:
            print(f"{self.tag}: Picture is too blurry. Analysis might not be good.")

        green_mask , yellow_mask , contours = (self.plant_masking_and_contour(img))
        if len(contours) == 0:
            print("Unable to detect plant on picture"); return None
        
        contour = max(contours , key=cv2.contourArea)
        x , y , w , h = cv2.boundingRect(contour)
        cv2.rectangle(img, (x, y), (x + w, y + h), (255, 0, 0), 2)
        data["Height"] = h * pixel_ratio; data["Width"] = w * pixel_ratio
        print(f"{self.tag}: Height - {data['Height']} cm | Width - {data['Width']} cm")

        curr_area = cv2.contourArea(contour)
        data["curr_area"] = curr_area
        print(f"{self.tag}: Current Plant Area - {curr_area}")
        if prev_area is not None:
            data["Growth"] = curr_area - prev_area
            print(f"{self.tag}: Growth - {data['Growth']}")
        else:
            print(f"{self.tag}: Unable to calculate growth")
        
        green_pixel = cv2.countNonZero(green_mask)
        yellow_pixel = cv2.countNonZero(yellow_mask)
        total_pixel = green_pixel + yellow_pixel
        try:
            data["yellowing_ratio"] = (yellow_pixel / total_pixel) * 100
        except ZeroDivisionError:
            data["yellowing_ratio"] = None
        print(f"{self.tag}: Yellowing Ratio - {data['yellowing_ratio']}")
        
        center_of_mass = cv2.moments(contour)
        if center_of_mass["m00"] != 0:
            cx , cy = int(center_of_mass["m10"] / center_of_mass["m00"]) , int(center_of_mass["m01"] / center_of_mass["m00"])
        else:
            cx , cy = 0 , 0
        cv2.circle(img, (cx, cy), 7, (0, 0, 255), -1)
        data["curr_center"] = [cx, cy]

        if prev_center is not None:
            dx = cx - prev_center[0]
            dy = cy - prev_center[1]
            data["move_amount"] = (np.sqrt(dx ** 2 + dy ** 2) * pixel_ratio)
            print(f"{self.tag}: Moving amount - {data['move_amount']}")
            data["bending_angle"] = np.degrees(np.arctan2(dx , -dy))
            print(f"{self.tag}: Bending angle - {data['bending_angle']}")
        else:
            print(f"{self.tag}: Unable to calculate moving amount and bending angle")

        if display:
            cv2.imshow("Analysis", img)
            cv2.waitKey(0)
            cv2.destroyWindow("Analysis")

        return data

    def send_metrics_to_firebase(self):
        data = self.analysis(
            prev_area=self.prev_area,
            prev_center=self.prev_center,
            display=False,
        )
        if data is None:
            print(f"{self.tag}: Analysis failed, skipping Firebase upload.")
            return

        self.prev_area = data.get("curr_area")
        self.prev_center = data.get("curr_center")

        result = self.firebase.send_data_to_firestore(data, source="camera")
        if result.get("ok"):
            print(f"{self.tag}: Plant metrics sent to Firebase. Doc ID: {result.get('id')}")
        else:
            print(f"{self.tag}: Failed to send plant metrics. Error: {result.get('error')}")

if __name__ == '__main__':
    cam = Camera()
    hours = 1
    print(f"[camera.py]: Starting — analysis will run every {hours} hour")

    while True:
        cam.send_metrics_to_firebase()
        next_run = time.strftime("%H:%M", time.localtime(time.time() + hours * 3600))
        print(f"[camera.py]: Next run at {next_run}")
        time.sleep(hours * 3600)