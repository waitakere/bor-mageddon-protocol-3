import React, { useState } from 'react';

interface CharacterSelectorProps {
    onSelect: (characterId: string) => void;
}

// 1993 Yugoslav Roster Data
const ROSTER = [
    {
        id: 'marko',
        name: 'MARKO',
        occupation: 'RTB ELECTRICIAN',
        weapon: 'CHAIN-LINK BELT / BARE KNUCKLES',
        stats: { power: 8, speed: 5, smf: 7 },
        description: 'Fired for attempting to unionize the copper mines. Now he is here to dismantle the corrupt RTB management piece by piece.'
    },
    {
        id: 'maja',
        name: 'MAJA',
        occupation: 'UNDERGROUND COURIER',
        weapon: 'SMEDEREVAC STOVE DOOR / LEAD PIPE',
        stats: { power: 5, speed: 9, smf: 8 },
        description: 'Lost her life savings to the hyperinflation banks. She moves fast, hits hard, and takes no prisoners.'
    }
];

export const CharacterSelector: React.FC<CharacterSelectorProps> = ({ onSelect }) => {
    // Controls whether we are on the Title Screen or the Character Select Screen
    const [activeStep, setActiveStep] = useState<'TITLE' | 'ROSTER'>('TITLE');
    const [selectedCharId, setSelectedCharId] = useState<string>(ROSTER[0].id);

    // Get the currently highlighted character object
    const activeChar = ROSTER.find(c => c.id === selectedCharId) || ROSTER[0];

    return (
        <div className="relative w-full h-full flex justify-center items-center p-4 z-10">
            
            {/* =========================================
                STEP 1: THE TITLE SCREEN
            ========================================= */}
            {activeStep === 'TITLE' && (
                <div className="start-box flex flex-col items-center w-full max-w-3xl animate-in fade-in zoom-in duration-500">
                    
                    <h1 className="font-metal text-white text-6xl md:text-8xl tracking-widest drop-shadow-[4px_4px_0px_#ff3333] mb-4">
                        BOR-MAGEDDON
                    </h1>
                    
                    <h2 className="font-mono-title text-xl md:text-2xl text-gray-400 mb-12">
                        [TERMINAL_01]
                    </h2>

                    <hr className="w-full border-t border-red-900 mb-8 opacity-50" />

                    <button 
                        id="initialize-btn" 
                        onClick={() => setActiveStep('ROSTER')}
                    >
                        INITIALIZE PROTOCOL
                    </button>

                    <p className="mt-8 text-green-500 font-mono text-sm tracking-widest animate-pulse">
                        ESTABLISHING SECURE CONNECTION...
                    </p>
                </div>
            )}

            {/* =========================================
                STEP 2: THE ROSTER SELECTION
            ========================================= */}
            {activeStep === 'ROSTER' && (
                <div className="start-box flex flex-col w-full max-w-4xl animate-in fade-in duration-300 text-left">
                    
                    <div className="text-center mb-8">
                        <h1 className="font-metal text-white text-4xl md:text-5xl tracking-widest drop-shadow-[3px_3px_0px_#ff3333] mb-2">
                            SELECT OPERATIVE
                        </h1>
                        <p className="font-mono text-red-500 text-sm tracking-widest">
                            WARNING: PERMADEATH PROTOCOLS ACTIVE
                        </p>
                    </div>

                    <div className="flex flex-col md:flex-row gap-8 w-full">
                        
                        {/* Left Column: Character List */}
                        <div className="flex flex-col gap-4 w-full md:w-1/3 border-r border-red-900/50 pr-8">
                            {ROSTER.map((char) => (
                                <button
                                    key={char.id}
                                    onClick={() => setSelectedCharId(char.id)}
                                    className={`
                                        font-mono-title text-left px-4 py-3 border-2 transition-all
                                        ${selectedCharId === char.id 
                                            ? 'bg-red-600 border-red-500 text-black shadow-[4px_4px_0px_#660000]' 
                                            : 'bg-black border-zinc-800 text-gray-500 hover:border-red-500 hover:text-white'}
                                    `}
                                >
                                    {char.name}
                                </button>
                            ))}
                        </div>

                        {/* Right Column: Character Stats & Lore */}
                        <div className="flex flex-col w-full md:w-2/3">
                            <h2 className="font-metal text-white text-4xl mb-1 text-shadow-sm">
                                {activeChar.name}
                            </h2>
                            <p className="font-mono text-red-500 font-bold mb-4 tracking-wider">
                                // {activeChar.occupation}
                            </p>
                            
                            <div className="bg-black/50 border border-zinc-800 p-4 mb-6 font-mono text-sm text-gray-300 leading-relaxed">
                                {activeChar.description}
                            </div>

                            <div className="space-y-3 font-mono text-sm mb-8">
                                <div className="flex items-center">
                                    <span className="w-24 text-gray-500">WEAPON:</span>
                                    <span className="text-white">{activeChar.weapon}</span>
                                </div>
                                <div className="flex items-center">
                                    <span className="w-24 text-gray-500">POWER:</span>
                                    <span className="text-red-500 tracking-widest">
                                        {'█'.repeat(activeChar.stats.power)}{'░'.repeat(10 - activeChar.stats.power)}
                                    </span>
                                </div>
                                <div className="flex items-center