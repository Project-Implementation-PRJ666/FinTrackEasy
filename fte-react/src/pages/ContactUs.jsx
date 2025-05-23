// src/pages/ContactUs.jsx
import { useState } from "react";

import api from "@/api/axios";

export default function ContactUs() {
    const [formData, setFormData] = useState({
        name: "",
        phone: "",
        email: "",
        description: "",
    });

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleClear = () => {
        setFormData({
            name: "",
            phone: "",
            email: "",
            description: "",
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await api.post(`${import.meta.env.VITE_API_BASE_URL}/contact`, formData);
            alert("Message sent!");
            handleClear();
        } catch (err) {
            alert(
                err.response?.data?.message || err.response?.data?.error || "Failed to send message"
            );
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-r from-white to-green-100 flex flex-col">
            {/* Header
            <header className="bg-green-900 h-14 flex items-center justify-between px-6">
                <div className="flex items-center space-x-2 text-white font-bold text-lg">
                    <span className="text-2xl">🖐</span>
                    <span>FinTrackEasy</span>
                </div>
                <div className="flex items-center space-x-2">
                    <button className="bg-gray-100 px-3 py-1 rounded shadow text-sm text-gray-800 hover:bg-gray-200">
                        Sign in
                    </button>
                    <span className="text-white text-2xl">👤</span>
                </div>
            </header> */}

            {/* Main Content */}
            <main className="flex-grow flex justify-center items-center p-6">
                <div className="w-full max-w-5xl flex shadow-lg rounded p-8">
                    {/* Left: Text */}
                    <div className="w-1/2 pr-8 text-left">
                        <h2 className="text-3xl font-bold text-green-900 mb-4">Contact Us</h2>
                        <p className="text-gray-700 leading-relaxed text-sm">
                            We are here happy to help you.
                            <br />
                            Let us know if there is anything can be better or best serving you.
                            <br />
                            Please do not hesitate to contact us by the detail with your
                            information.
                        </p>
                    </div>

                    {/* Right: Form */}
                    <form onSubmit={handleSubmit} className="w-1/2 space-y-4">
                        <div>
                            <label className="block text-black font-semibold">Name:</label>
                            <input
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                className="w-full px-4 py-2 text-black bg-gray-200 rounded"
                            />
                        </div>
                        <div>
                            <label className="block text-black font-semibold">Phone:</label>
                            <input
                                type="text"
                                name="phone"
                                value={formData.phone}
                                onChange={handleChange}
                                className="w-full px-4 py-2 text-black bg-gray-200 rounded"
                            />
                        </div>
                        <div>
                            <label className="block text-black font-semibold">Email:</label>
                            <input
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                className="w-full px-4 py-2 text-black bg-gray-200 rounded"
                            />
                        </div>
                        <div>
                            <label className="block text-black font-semibold">Description</label>
                            <textarea
                                name="description"
                                value={formData.description}
                                onChange={handleChange}
                                rows={4}
                                placeholder="Enter a brief description.."
                                className="w-full px-4 py-2 text-black bg-gray-200 rounded resize-none"
                            />
                        </div>
                        <div className="flex justify-end space-x-4 pt-2">
                            <button
                                type="button"
                                onClick={handleClear}
                                className="bg-red-700 text-white px-4 py-2 rounded hover:bg-red-800"
                            >
                                Clear
                            </button>
                            <button
                                type="submit"
                                className="bg-green-800 text-white px-4 py-2 rounded hover:bg-green-900"
                            >
                                Send
                            </button>
                        </div>
                    </form>
                </div>
            </main>
        </div>
    );
}
