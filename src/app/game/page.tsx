"use client";

import React, { useEffect, useRef, useCallback } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

// Font Awesomeのインポートを追加
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faAnchor, faIndustry } from "@fortawesome/free-solid-svg-icons";
import { renderToStaticMarkup } from "react-dom/server";

// GeoJSONデータのインポート
import { useGameContext } from "./GameContext";
import { storagePoint } from "./storagePoint";
import { portPoint } from "./portPoint";

// 新しいコンポーネントのインポート
import DiceComponent from "./DiceComponent";
import PlayerInfoComponent from "./PlayerInfoComponent";
import QuestInfoComponent from "./QuestInfoComponent";
import GameStartComponent from "./GameStartComponent";

const ClickToAddPinMap: React.FC = () => {
    const mapContainer = useRef<HTMLDivElement>(null);
    const map = useRef<maplibregl.Map | null>(null);
    const markers = useRef<maplibregl.Marker[]>([]);
    const createMarkersRef = useRef<(() => void) | null>(null);

    const {
        deliveryStack,
        deliveryResult,
        pushDeliveryStack,
        currentYear,
        availableYears,
        setCurrentYear,
        isGameStarted,
        players,
        currentPlayer,
        boardPositions,
        gamePhase,
        currentQuest,
    } = useGameContext();

    const storageBuildings = storagePoint.getStorages();
    const portBuildings = portPoint.getPorts();

    // マーカーをクリアする関数
    const clearAllMarkers = () => {
        markers.current.forEach((marker) => marker.remove());
        markers.current = [];
        // DOM要素も削除
        document.querySelectorAll(".storage-marker, .port-marker, .player-marker, .relay-marker").forEach((el) => el.remove());
    };

    // すべてのマーカーを作成する関数
    const createAllMarkers = useCallback(() => {
        if (!map.current || !map.current.isStyleLoaded()) return;

        // 既存のマーカーをクリア
        clearAllMarkers();

        // 倉庫マーカーを作成
        storageBuildings.forEach((storage) => {
            const iconHtml = renderToStaticMarkup(<FontAwesomeIcon icon={faIndustry} style={{ color: "#fb6aaeff", fontSize: "30px" }} />);

            const el = document.createElement("div");
            el.className = "storage-marker";
            el.innerHTML = iconHtml;
            el.style.transform = "translate(-50%, -100%)";
            el.style.cursor = "pointer";

            if (gamePhase === "delivery") {
                el.style.filter = "drop-shadow(0 0 8px rgba(255, 255, 0, 0.8))";
                el.style.outline = "2px solid #ffff00";
                el.style.outlineOffset = "2px";
            }

            el.addEventListener("click", () => {
                console.log("Storage clicked:", storage.name, "Game phase:", gamePhase);
                if (gamePhase === "delivery") {
                    pushDeliveryStack(storage);
                }
            });

            const marker = new maplibregl.Marker({ element: el }).setLngLat([storage.coords.longitude, storage.coords.latitude]).addTo(map.current!);
            markers.current.push(marker);
        });

        // 港マーカーを作成
        portBuildings.forEach((port) => {
            const iconHtml = renderToStaticMarkup(<FontAwesomeIcon icon={faAnchor} style={{ color: "#0000ff", fontSize: "30px" }} />);

            const el = document.createElement("div");
            el.className = "port-marker";
            el.innerHTML = iconHtml;
            el.style.transform = "translate(-50%, -100%)";
            el.style.cursor = "pointer";

            if (gamePhase === "delivery") {
                el.style.filter = "drop-shadow(0 0 8px rgba(255, 255, 0, 0.8))";
                el.style.outline = "2px solid #ffff00";
                el.style.outlineOffset = "2px";
            }

            el.addEventListener("click", () => {
                console.log("Port clicked:", port.name, "Game phase:", gamePhase);
                if (gamePhase === "delivery") {
                    pushDeliveryStack(port);
                }
            });

            const marker = new maplibregl.Marker({ element: el }).setLngLat([port.coords.longitude, port.coords.latitude]).addTo(map.current!);
            markers.current.push(marker);
        });

        // プレイヤーマーカーを作成
        if (isGameStarted && boardPositions.length > 0) {
            players.forEach((player, index) => {
                const building = boardPositions[player.position];
                if (!building) return;

                const el = document.createElement("div");
                el.className = "player-marker";
                el.style.backgroundColor = player.id === currentPlayer.id ? "#ff4444" : "#ffaa44";
                el.style.width = "20px";
                el.style.height = "20px";
                el.style.borderRadius = "50%";
                el.style.border = "3px solid #ffffff";
                el.style.boxSizing = "border-box";
                el.style.transform = "translate(-50%, -50%)";
                el.style.position = "relative";
                el.style.zIndex = "1000";

                el.innerHTML = `<div style="
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    color: white;
                    font-size: 10px;
                    font-weight: bold;
                ">${index + 1}</div>`;

                const marker = new maplibregl.Marker({ element: el }).setLngLat([building.coords.longitude, building.coords.latitude]).addTo(map.current!);
                markers.current.push(marker);
            });
        }

        // 中継地点マーカーを作成
        if (currentQuest && gamePhase === "delivery") {
            const startEl = document.createElement("div");
            startEl.className = "relay-marker start-marker";
            startEl.style.backgroundColor = "#00ff00";
            startEl.style.width = "16px";
            startEl.style.height = "16px";
            startEl.style.borderRadius = "50%";
            startEl.style.border = "3px solid #ffffff";
            startEl.style.boxSizing = "border-box";
            startEl.style.transform = "translate(-50%, -50%)";

            const startMarker = new maplibregl.Marker({ element: startEl })
                .setLngLat([currentQuest.from.coords.longitude, currentQuest.from.coords.latitude])
                .addTo(map.current!);
            markers.current.push(startMarker);
        }

        deliveryStack.forEach((stack) => {
            const el = document.createElement("div");
            el.className = "relay-marker";
            el.style.backgroundColor = "#ff0000";
            el.style.width = "12px";
            el.style.height = "12px";
            el.style.borderRadius = "50%";
            el.style.border = "2px solid #ffffff";
            el.style.boxSizing = "border-box";
            el.style.transform = "translate(-50%, -50%)";

            const marker = new maplibregl.Marker({ element: el }).setLngLat([stack.coords.longitude, stack.coords.latitude]).addTo(map.current!);
            markers.current.push(marker);
        });

        // 配送ルートの線を描画
        const lineId = "relay-line";
        if (map.current.getLayer(lineId)) {
            map.current.removeLayer(lineId);
        }
        if (map.current.getSource(lineId)) {
            map.current.removeSource(lineId);
        }

        if (currentQuest && gamePhase === "delivery" && deliveryStack.length >= 1) {
            const lineCoordinates = [
                [currentQuest.from.coords.longitude, currentQuest.from.coords.latitude],
                ...deliveryStack.map((stack) => [stack.coords.longitude, stack.coords.latitude]),
            ];
            map.current.addSource(lineId, {
                type: "geojson",
                data: {
                    type: "Feature",
                    properties: {},
                    geometry: {
                        type: "LineString",
                        coordinates: lineCoordinates,
                    },
                },
            });
            map.current.addLayer({
                id: lineId,
                type: "line",
                source: lineId,
                layout: {
                    "line-join": "round",
                    "line-cap": "round",
                },
                paint: {
                    "line-color": "#ff0000",
                    "line-width": 4,
                    "line-opacity": 0.7,
                },
            });
        }
    }, [storageBuildings, portBuildings, gamePhase, pushDeliveryStack, isGameStarted, players, currentPlayer, boardPositions, currentQuest, deliveryStack]);

    // refに関数を保存
    useEffect(() => {
        createMarkersRef.current = createAllMarkers;
    }, [createAllMarkers]);

    useEffect(() => {
        if (map.current) return;

        const apiKey = process.env.NEXT_PUBLIC_AWS_LOCATION_API_KEY!;
        const region = "us-east-1";
        const style = "Standard";
        const colorScheme = "Light";
        const styleUrl = `https://maps.geo.${region}.amazonaws.com/v2/styles/${style}/descriptor?key=${apiKey}&color-scheme=${colorScheme}`;

        if (mapContainer.current) {
            map.current = new maplibregl.Map({
                container: mapContainer.current,
                style: styleUrl,
                center: [138.2529, 36.2048],
                zoom: 5,
            });

            // スタイルが完全に読み込まれた後にマーカーを作成
            map.current.on("load", () => {
                if (map.current?.isStyleLoaded() && createMarkersRef.current) {
                    createMarkersRef.current();
                }
            });

            // スタイルが再読み込みされた際にもマーカーを再作成
            map.current.on("styledata", () => {
                if (map.current?.isStyleLoaded() && createMarkersRef.current) {
                    createMarkersRef.current();
                }
            });
        }

        return () => {
            clearAllMarkers();
        };
    }, []); // 地図の初期化は一度だけ行う

    // 地図が準備できた時とデータが変更された際にマーカーを更新
    useEffect(() => {
        if (map.current && map.current.isStyleLoaded()) {
            createAllMarkers();
        }
    }, [createAllMarkers]);

    return (
        <div className="w-full h-screen relative">
            {/* ゲーム開始画面（ゲーム未開始の場合） */}
            {!isGameStarted && (
                <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <GameStartComponent />
                </div>
            )}

            {/* 左上の年度選択UI */}
            <div className="absolute top-4 left-4 bg-white bg-opacity-90 rounded-lg shadow-md p-4 z-10" style={{ minWidth: "200px" }}>
                <div className="font-bold mb-2">年度選択</div>
                <select value={currentYear} onChange={(e) => setCurrentYear(e.target.value)} className="w-full p-2 border border-gray-300 rounded">
                    {availableYears.map((year) => (
                        <option key={year} value={year}>
                            {year}年
                        </option>
                    ))}
                </select>
                <div className="text-sm text-gray-600 mt-1">現在: {currentYear}年のルートデータ</div>
            </div>

            {/* 右上の情報表示UIをここに追加 */}
            <div className="absolute top-4 right-4 bg-white bg-opacity-90 rounded-lg shadow-md p-4 z-10" style={{ minWidth: "200px" }}>
                <div className="font-bold mb-2">ルート情報</div>
                <div className="flex flex-col gap-1 text-sm">
                    <div>
                        距離：<span className="font-semibold">{deliveryResult.distance.toFixed(1)} km</span>
                    </div>
                    <div>
                        ガソリン消費量：<span className="font-semibold">{deliveryResult.gasolineConsumption.toFixed(2)} L</span>
                    </div>
                    <div>
                        CO₂排出量：<span className="font-semibold">{deliveryResult.co2Emission.toFixed(2)} kg</span>
                    </div>
                </div>
            </div>

            {/* 左下にサイコロコンポーネント */}
            {isGameStarted && (
                <div className="absolute bottom-4 left-4 z-10">
                    <DiceComponent />
                </div>
            )}

            {/* 右下にプレイヤー情報 */}
            {isGameStarted && (
                <div className="absolute bottom-4 right-4 z-10">
                    <PlayerInfoComponent />
                </div>
            )}

            {/* 中央下にクエスト情報 */}
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-10">
                <QuestInfoComponent />
            </div>

            <div ref={mapContainer} className="w-full h-full" />
        </div>
    );
};

export default ClickToAddPinMap;
