import React, { useState } from 'react';
import axios from 'axios';
import { Upload, Edit, Video, ZoomIn, ZoomOut, Clock, Copy } from 'lucide-react';

function VideoEditor() {
    const [file, setFile] = useState(null);
    const [startTime, setStartTime] = useState(0);
    const [endTime, setEndTime] = useState(0);
    const [action, setAction] = useState('trim');
    const [brightness, setBrightness] = useState(1.0);
    const [speed, setSpeed] = useState(1.0);
    const [format, setFormat] = useState('mp4');
    const [downloadLink, setDownloadLink] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        setFile(selectedFile);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        const formData = new FormData();
        formData.append('file', file);
        formData.append('start_time', startTime);
        formData.append('end_time', endTime);
        formData.append('action', action);
        formData.append('brightness_factor', brightness);
        formData.append('speed_factor', speed);
        formData.append('output_format', format);

        try {
            const response = await axios.post('http://localhost:8000/edit_video/', formData, {
                responseType: 'blob',
                timeout: 300000,
                headers: {
                    'Content-Type': 'multipart/form-data',
                }
            });

            const url = window.URL.createObjectURL(new Blob([response.data]));
            setDownloadLink(url);
        } catch (error) {
            console.error('Error editing video:', error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-700 flex items-center justify-center p-6">
            <div className="w-full max-w-md bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl border border-white/20 p-8">
                <h1 className="text-4xl font-extrabold text-center mb-8 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-600">
                    Video Editor
                </h1>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="relative">
                        <input
                            type="file"
                            id="file-upload"
                            onChange={handleFileChange}
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
                            <option value="speedup">Speed Up</option>
                            <option value="slowdown">Slow Down</option>
                        </select>
                    </div>

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
                                className="w-full bg-gray-800/50 text-white rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>
                    )}

                    {['speedup', 'slowdown'].includes(action) && (
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
                                className="w-full bg-gray-800/50 text-white rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>
                    )}

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
                        disabled={isLoading}
                        className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 rounded-lg hover:opacity-90 transition-all flex items-center justify-center"
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
                    <a
                        href={downloadLink}
                        download="edited_video.mp4"
                        className="block text-center mt-4 text-blue-400 hover:text-blue-300 transition-colors"
                    >
                        Download Edited Video
                    </a>
                )}
            </div>
        </div>
    );
}

export default VideoEditor;