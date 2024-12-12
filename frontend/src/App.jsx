import React from 'react';
import VideoEditor from './VideoEditor';
import { Waves } from 'lucide-react';

function App() {
    return (
        <div className="antialiased bg-gradient-to-br from-gray-900 via-gray-800 to-gray-700 min-h-screen flex flex-col">
            <header className="absolute top-0 left-0 right-0 p-4">
                <div className="container mx-auto flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <Waves className="text-blue-400" size={32} />
                        <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-600">
                            Media Toolkit
                        </h1>
                    </div>
                    {/*<nav className="space-x-4 hidden md:block">*/}
                    {/*    <a*/}
                    {/*        href="#"*/}
                    {/*        className="text-gray-300 hover:text-white transition-colors font-medium"*/}
                    {/*    >*/}
                    {/*        Home*/}
                    {/*    </a>*/}
                    {/*    <a*/}
                    {/*        href="#"*/}
                    {/*        className="text-gray-300 hover:text-white transition-colors font-medium"*/}
                    {/*    >*/}
                    {/*        About*/}
                    {/*    </a>*/}
                    {/*    <a*/}
                    {/*        href="#"*/}
                    {/*        className="text-gray-300 hover:text-white transition-colors font-medium"*/}
                    {/*    >*/}
                    {/*        Contact*/}
                    {/*    </a>*/}
                    {/*</nav>*/}
                </div>
            </header>

            <main className="flex-grow flex items-center justify-center">
                <div className="container mx-auto p-4 pt-20">
                    <VideoEditor />
                </div>
            </main>

            <footer className="absolute bottom-0 left-0 right-0 p-4 text-center">
                <p className="text-sm text-gray-400">
                    © {new Date().getFullYear()} Media Toolkit. All rights reserved.
                </p>
            </footer>
        </div>
    );
}

export default App;