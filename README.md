# VideoMaster 🎬✂️

## Overview

VideoMaster is a modern, user-friendly web application that allows you to easily edit videos directly in your browser. With a sleek interface and powerful editing capabilities, VideoMaster makes video manipulation simple and intuitive.

## 🌟 Features

- **Video Trimming**: Cut out unwanted parts of your video
- **Brightness Adjustment**: Lighten or darken your video
- **Speed Control**: Speed up or slow down video playback
- **Text Overlay**: Add custom text directly to your video
- **Video Effects**: Apply grayscale, sepia, and negative filters
- **Cropping**: Customize video dimensions
- **Multiple Format Support**: Export in MP4, AVI, and MOV formats
- **Responsive Design**: Works on desktop and mobile devices

## 🛠 Tech Stack

### Frontend
- React
- Tailwind CSS
- Axios
- Lucide React Icons

### Backend
- FastAPI
- OpenCV
- Python

## 📦 Prerequisites

- Node.js (v14+)
- Python (v3.9+)
- pip
- npm

## 🚀 Installation

### Frontend Setup

1. Clone the repository
```bash
git clone https://github.com/yourusername/videomaster.git
cd videomaster/frontend
```

2. Install dependencies
```bash
npm install
```

3. Start the development server
```bash
npm start
```

### Backend Setup

1. Navigate to backend directory
```bash
cd backend
```

2. Create a virtual environment
```bash
python -m venv venv
source venv/bin/activate  # On Windows use `venv\Scripts\activate`
```

3. Install dependencies
```bash
pip install -r requirements.txt
```

4. Run the backend server
```bash
uvicorn main:app --reload
```

## 🖥 Usage

1. Upload your video
2. Select an editing action:
   - Trim
   - Brighten/Darken
   - Apply Grayscale/Sepia/Negative Filter
   - Add Text Overlay
3. Configure parameters
4. Click "Edit Video"
5. Download your edited video

## ✨ New: Text Overlay Feature

VideoMaster now supports adding custom text directly to your videos! 

- Select the "Overlay Text" action
- Enter your desired text
- The text will be displayed on your video, perfect for adding captions, watermarks, or creative annotations

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 🐛 Known Issues

- Large video files may take longer to process
- Some complex video formats might have limited support

## 📝 License

Distributed under the MIT License. See `LICENSE` for more information.

## 🙌 Acknowledgements

- [React](https://reactjs.org/)
- [FastAPI](https://fastapi.tiangolo.com/)
- [OpenCV](https://opencv.org/)
- [Tailwind CSS](https://tailwindcss.com/)
