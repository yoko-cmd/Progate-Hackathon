"use client";

import React from "react";
import { useGameContext } from "./GameContext";

const DiceComponent: React.FC = () => {
    const { gamePhase, diceValue, rollDice, currentPlayer } = useGameContext();

    return (
        <div className="bg-white bg-opacity-90 rounded-lg shadow-md p-4" style={{ minWidth: "200px" }}>
            <div className="font-bold mb-2">サイコロ</div>

            {gamePhase === "dice" && (
                <div className="text-center">
                    <div className="mb-3">
                        <span className="text-sm text-gray-600">{currentPlayer.name}のターン</span>
                    </div>

                    <button onClick={rollDice} className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded mb-3">
                        サイコロを振る
                    </button>

                    {diceValue > 0 && (
                        <div className="text-center">
                            <div className="text-4xl mb-2">🎲</div>
                            <div className="text-2xl font-bold">{diceValue}</div>
                        </div>
                    )}
                </div>
            )}

            {gamePhase === "delivery" && (
                <div className="text-center">
                    <div className="text-sm text-gray-600 mb-2">配送イベント中</div>
                    <div className="text-xs text-gray-500">最適なルートを選択してください</div>
                </div>
            )}
        </div>
    );
};

export default DiceComponent;
