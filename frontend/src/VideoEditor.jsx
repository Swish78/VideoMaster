import React, { useState, useRef } from 'react';
import axios from 'axios';
import { Upload, Edit, Video, ZoomIn, ZoomOut, Clock, Copy, Download, Crop, Type } from 'lucide-react';

function VideoEditor() {
    const [file, setFile] = useState(null);
    const [startTime, setStartTime] = useState(0);
    const [endTime, setEndTime] = useState(0);
    const [action, setAction] = useState('trim');
    const [brightness, setBrightness] = useState(1.0);
    const [speed, setSpeed] = useState(1.0);
    const [format, setFormat] = useState('mp4');
    const [downloadLink, setDownloadLink] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    const [overlayText, setOverlayText] = useState('');

    const [cropX, setCropX] = useState(0);
    const [cropY, setCropY] = useState(0);
    const [cropWidth, setCropWidth] = useState(null);
    const [cropHeight, setCropHeight] = useState(null);

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        setFile(selectedFile);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setDownloadLink(null);
        const formData = new FormData();
        formData.append('file', file);
        formData.append('start_time', startTime);
        formData.append('end_time', endTime);
        formData.append('action', action);
        formData.append('brightness_factor', brightness);
        formData.append('speed_factor', speed);
        formData.append('output_format', format);

        if (action === 'overlay_text' && overlayText) {
            formData.append('overlay_text', overlayText);
        }

        formData.append('crop_x', cropX);
        formData.append('crop_y', cropY);
        if (cropWidth) formData.append('crop_width', cropWidth);
        if (cropHeight) formData.append('crop_height', cropHeight);

        try {
            const response = await axios.post('http://localhost:8000/edit_video/', formData, {
                responseType: 'blob',
                timeout: 300000, // 5 minutes timeout for large videos
            });

            const url = window.URL.createObjectURL(new Blob([response.data]));
            setDownloadLink(url);
        } catch (error) {
            console.error('Error editing video:', error);
            alert('Failed to process video. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDownload = () => {
        if (downloadLink) {
            const link = document.createElement('a');
            link.href = downloadLink;
            link.setAttribute('download', `edited_video.${format}`);
            document.body.appendChild(link);
            link.click();
            link.parentNode.removeChild(link);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-700 flex items-center justify-center p-6">
            <div className="w-full max-w-md bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl border border-white/20 p-8">
                <h1 className="text-4xl font-extrabold text-center mb-8 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-600">
                    VideoMaster
                </h1>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="relative">
                        <input
                            type="file"
                            id="file-upload"
                            onChange={handleFileChange}
                            accept="video/*"
                            required
                            className="hidden"
                        />
                        <label
                            htmlFor="file-upload"
                            className="flex items-center justify-center w-full p-4 border-2 border-dashed border-blue-500/50 rounded-xl cursor-pointer hover:bg-blue-500/10 transition-all"
                        >
                            <Upload className="mr-2 text-blue-400" />
                            <span className="text-gray-300">
                                {file ? file.name : 'Upload Video'}
                            </span>
                        </label>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="flex items-center text-gray-300 mb-2">
                                <Clock className="mr-2 text-blue-400" size={18} />
                                Start Time
                            </label>
                            <input
                                type="number"
                                value={startTime}
                                onChange={(e) => setStartTime(e.target.value)}
                                min="0"
                                step="0.1"
                                className="w-full bg-gray-800/50 text-white rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="flex items-center text-gray-300 mb-2">
                                <Clock className="mr-2 text-blue-400" size={18} />
                                End Time
                            </label>
                            <input
                                type="number"
                                value={endTime}
                                onChange={(e) => setEndTime(e.target.value)}
                                min="0"
                                step="0.1"
                                className="w-full bg-gray-800/50 text-white rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="flex items-center text-gray-300 mb-2">
                            <Edit className="mr-2 text-blue-400" size={18} />
                            Action
                        </label>
                        <select
                            value={action}
                            onChange={(e) => setAction(e.target.value)}
                            className="w-full bg-gray-800/50 text-white rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                        >
                            <option value="trim">Trim</option>
                            <option value="brighten">Brighten</option>
                            <option value="darken">Darken</option>
                            <option value="apply_grayscale">Grayscale</option>
                            <option value="apply_sepia">Sepia</option>
                            <option value="negative">Negative</option>
                            <option value="overlay_text">Overlay Text</option>
                        </select>
                    </div>

                    {action === 'overlay_text' && (
                        <div>
                            <label className="flex items-center text-gray-300 mb-2">
                                <Type className="mr-2 text-blue-400" size={18} />
                                Overlay Text
                            </label>
                            <input
                                type="text"
                                value={overlayText}
                                onChange={(e) => setOverlayText(e.target.value)}
                                placeholder="Enter text to overlay"
                                className="w-full bg-gray-800/50 text-white rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>
                    )}

                    {['brighten', 'darken'].includes(action) && (
                        <div>
                            <label className="flex items-center text-gray-300 mb-2">
                                <ZoomIn className="mr-2 text-blue-400" size={18} />
                                Brightness Factor
                            </label>
                            <input
                                type="number"
                                step="0.1"
                                value={brightness}
                                onChange={(e) => setBrightness(e.target.value)}
                                min="0.1"
                                max="2.0"
                                className="w-full bg-gray-800/50 text-white rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>
                    )}

                    <div>
                        <label className="flex items-center text-gray-300 mb-2">
                            <ZoomOut className="mr-2 text-blue-400" size={18} />
                            Speed Factor
                        </label>
                        <input
                            type="number"
                            step="0.1"
                            value={speed}
                            onChange={(e) => setSpeed(e.target.value)}
                            min="-2.0"
                            max="2.0"
                            className="w-full bg-gray-800/50 text-white rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                        <p className="text-xs text-gray-400 mt-1">
                            Positive for forward, Negative for reverse
                        </p>
                    </div>

                    <div>
                        <label className="flex items-center text-gray-300 mb-2">
                            <Crop className="mr-2 text-blue-400" size={18} />
                            Crop Video
                        </label>
                        <div className="grid grid-cols-2 gap-4">
                            <input
                                type="number"
                                placeholder="X"
                                value={cropX}
                                onChange={(e) => setCropX(e.target.value)}
                                className="w-full bg-gray-800/50 text-white rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                            <input
                                type="number"
                                placeholder="Y"
                                value={cropY}
                                onChange={(e) => setCropY(e.target.value)}
                                className="w-full bg-gray-800/50 text-white rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                            <input
                                type="number"
                                placeholder="Width"
                                value={cropWidth || ''}
                                onChange={(e) => setCropWidth(e.target.value || null)}
                                className="w-full bg-gray-800/50 text-white rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                            <input
                                type="number"
                                placeholder="Height"
                                value={cropHeight || ''}
                                onChange={(e) => setCropHeight(e.target.value || null)}
                                className="w-full bg-gray-800/50 text-white rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>
                        <p className="text-xs text-gray-400 mt-1">
                            Optional: Crop starting X, Y, Width, Height
                        </p>
                    </div>

                    <div>
                        <label className="flex items-center text-gray-300 mb-2">
                            <Copy className="mr-2 text-blue-400" size={18} />
                            Output Format
                        </label>
                        <select
                            value={format}
                            onChange={(e) => setFormat(e.target.value)}
                            className="w-full bg-gray-800/50 text-white rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                        >
                            <option value="mp4">MP4</option>
                            <option value="avi">AVI</option>
                            <option value="mov">MOV</option>
                        </select>
                    </div>

                    <button
                        type="submit"
                        disabled={!file || isLoading}
                        className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 rounded-lg hover:opacity-90 transition-all flex items-center justify-center disabled:opacity-50"
                    >
                        {isLoading ? (
                            <span className="animate-pulse">Processing...</span>
                        ) : (
                            <>
                                <Video className="mr-2" /> Edit Video
                            </>
                        )}
                    </button>
                </form>

                {downloadLink && (
                    <div className="mt-4">
                        <button
                            onClick={handleDownload}
                            className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg transition-all flex items-center justify-center"
                        >
                            <Download className="mr-2" /> Download Edited Video
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

export default VideoEditor;