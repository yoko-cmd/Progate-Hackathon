"use client";

import React from "react";
import { useGameContext } from "./GameContext";

const PlayerInfoComponent: React.FC = () => {
    const { players, currentPlayer, boardPositions } = useGameContext();

    return (
        <div className="bg-white bg-opacity-90 rounded-lg shadow-md p-4" style={{ minWidth: "250px" }}>
            <div className="font-bold mb-2">プレイヤー情報</div>

            {players.length > 0 ? (
                <div className="space-y-3">
                    {players.map((player) => (
                        <div
                            key={player.id}
                            className={`p-2 rounded ${player.id === currentPlayer.id ? "bg-blue-100 border-2 border-blue-500" : "bg-gray-50"}`}
                        >
                            <div className="font-semibold text-sm">{player.name}</div>
                            <div className="text-xs text-gray-600 space-y-1">
                                <div>
                                    位置: {player.position + 1}/{boardPositions.length}
                                </div>
                                <div>スコア: {player.score}点</div>
                                <div>CO2削減: {player.totalCO2Saved.toFixed(1)}kg</div>
                                {boardPositions[player.position] && <div className="text-green-600">現在地: {boardPositions[player.position].name}</div>}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-sm text-gray-500">ゲームが開始されていません</div>
            )}
        </div>
    );
};

export default PlayerInfoComponent;
