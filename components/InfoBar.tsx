import React from 'react';

interface InfoBarProps {
    message: string;
}

export const InfoBar: React.FC<InfoBarProps> = ({ message }) => {
    if (!message) return null;

    return (
        <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white px-4 py-2 text-center text-sm font-bold shadow-sm relative z-50">
            <div className="flex items-center justify-center gap-2 animate-pulse">
                <span className="material-symbols-outlined text-lg">campaign</span>
                <span>{message}</span>
            </div>
        </div>
    );
};
