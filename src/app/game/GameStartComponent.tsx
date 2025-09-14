"use client";

import React, { useState } from "react";
import { useGameContext } from "./GameContext";

const GameStartComponent: React.FC = () => {
    const { isGameStarted, startGame, resetGame } = useGameContext();
    const [playerNames, setPlayerNames] = useState<string[]>(["プレイヤー1", "プレイヤー2"]);
    const [isSetupMode, setIsSetupMode] = useState<boolean>(!isGameStarted);

    const handleAddPlayer = () => {
        if (playerNames.length < 4) {
            setPlayerNames([...playerNames, `プレイヤー${playerNames.length + 1}`]);
        }
    };

    const handleRemovePlayer = (index: number) => {
        if (playerNames.length > 1) {
            setPlayerNames(playerNames.filter((_, i) => i !== index));
        }
    };

    const handlePlayerNameChange = (index: number, name: string) => {
        const newNames = [...playerNames];
        newNames[index] = name;
        setPlayerNames(newNames);
    };

    const handleStartGame = () => {
        startGame(playerNames);
        setIsSetupMode(false);
    };

    const handleResetGame = () => {
        resetGame();
        setIsSetupMode(true);
        setPlayerNames(["プレイヤー1", "プレイヤー2"]);
    };

    if (!isSetupMode && isGameStarted) {
        return (
            <button onClick={handleResetGame} className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded">
                ゲームリセット
            </button>
        );
    }

    return (
        <div className="bg-white bg-opacity-95 rounded-lg shadow-lg p-6" style={{ minWidth: "400px" }}>
            <div className="font-bold text-xl mb-4 text-center">物流すごろくゲーム</div>

            <div className="mb-4">
                <div className="font-semibold mb-2">プレイヤー設定</div>
                {playerNames.map((name, index) => (
                    <div key={index} className="flex items-center mb-2">
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => handlePlayerNameChange(index, e.target.value)}
                            className="flex-1 p-2 border border-gray-300 rounded mr-2"
                            placeholder={`プレイヤー${index + 1}の名前`}
                        />
                        {playerNames.length > 1 && (
                            <button onClick={() => handleRemovePlayer(index)} className="bg-red-500 text-white px-2 py-1 rounded text-sm">
                                削除
                            </button>
                        )}
                    </div>
                ))}

                <div className="flex justify-between mt-3">
                    {playerNames.length < 4 && (
                        <button onClick={handleAddPlayer} className="bg-blue-500 text-white px-3 py-1 rounded text-sm">
                            プレイヤー追加
                        </button>
                    )}
                </div>
            </div>

            <div className="mb-4 p-3 bg-gray-50 rounded">
                <div className="font-semibold text-sm mb-1">ゲームルール:</div>
                <ul className="text-xs text-gray-600 space-y-1">
                    <li>• サイコロを振って日本地図上のマスを移動</li>
                    <li>• 各マスで配送イベントが発生</li>
                    <li>• 最適なルートを選んでCO2削減を目指そう</li>
                    <li>• CO2削減量に応じてスコアを獲得</li>
                </ul>
            </div>

            <button onClick={handleStartGame} className="w-full bg-green-500 hover:bg-green-700 text-white font-bold py-3 px-4 rounded">
                ゲーム開始
            </button>
        </div>
    );
};

export default GameStartComponent;
