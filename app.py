import streamlit as st
import cv2
import numpy as np
from PIL import Image
import pytesseract
import re

st.title("Pokemon Card Authenticity Checker")

uploaded_file = st.file_uploader("Upload Pokemon Card", type=["jpg","png","jpeg"])

def blur_score(image):
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    return cv2.Laplacian(gray, cv2.CV_64F).var()

def aspect_ratio(image):
    h,w = image.shape[:2]
    return w/h

def extract_text(image):
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    text = pytesseract.image_to_string(gray)
    return text

def card_number(text):
    match = re.search(r"\d+/\d+", text)
    if match:
        return match.group()
    return None

def analyze(image):

    score = 100
    reasons = []

    blur = blur_score(image)
    ratio = aspect_ratio(image)

    text = extract_text(image)

    number = card_number(text)

    if blur < 80:
        score -= 20
        reasons.append("Image is blurry")

    if ratio < 0.68 or ratio > 0.75:
        score -= 20
        reasons.append("Card ratio looks wrong")

    if not number:
        score -= 20
        reasons.append("Card number not detected")

    if score > 80:
        verdict = "Likely Real"
    elif score > 50:
        verdict = "Suspicious"
    else:
        verdict = "Likely Fake"

    return score, verdict, reasons, text

if uploaded_file:

    image = Image.open(uploaded_file)
    image = np.array(image)

    st.image(image, width=300)

    score, verdict, reasons, text = analyze(image)

    st.write("Score:",score)
    st.write("Verdict:",verdict)

    st.write("Reasons")
    for r in reasons:
        st.write("-",r)

    st.write("Detected Text")
    st.write(text)
