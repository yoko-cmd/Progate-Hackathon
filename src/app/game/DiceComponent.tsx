"use client";

import React from "react";
import { useGameContext } from "./GameContext";

const DiceComponent: React.FC = () => {
    const { gamePhase, diceValue, rollDice, currentPlayer, completeDeliveryEvent, deliveryStack, currentQuest } = useGameContext();

    const canCompleteDelivery = () => {
        if (!currentQuest) return false;

        // 配送スタックが空の場合は開始地点にいることを意味し、
        // スタックに要素がある場合は最後の要素が現在地
        const isAtDestination =
            deliveryStack.length === 0
                ? currentQuest.from.id === currentQuest.to.id // 開始地点と目的地が同じ場合
                : deliveryStack[deliveryStack.length - 1].id === currentQuest.to.id;

        return isAtDestination;
    };

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
                    <div className="text-xs text-gray-500 mb-3">最適なルートを選択してください</div>

                    <button
                        onClick={completeDeliveryEvent}
                        disabled={!canCompleteDelivery()}
                        className={`font-bold py-2 px-4 rounded ${
                            canCompleteDelivery() ? "bg-green-500 hover:bg-green-700 text-white" : "bg-gray-300 text-gray-500 cursor-not-allowed"
                        }`}
                    >
                        配送完了
                    </button>

                    {!canCompleteDelivery() && <div className="text-xs text-red-500 mt-2">目的地に到達してください</div>}
                </div>
            )}
        </div>
    );
};

export default DiceComponent;
