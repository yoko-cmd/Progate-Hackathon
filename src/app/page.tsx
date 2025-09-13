/* eslint-disable @typescript-eslint/no-explicit-any */
// page.tsx (修正後)

"use client";

import React, { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

// Font Awesomeのインポートを追加
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faIndustry } from "@fortawesome/free-solid-svg-icons";
import { renderToStaticMarkup } from "react-dom/server";

// GeoJSONデータのインポート
import geojson from "./point.json";

// ピンデータを管理するためのインターフェース
interface MarkerData {
    id: string;
    coordinates: [number, number];
    timestamp: Date;
    markerInstance: maplibregl.Marker;
}

const ClickToAddPinMap: React.FC = () => {
    const mapContainer = useRef<HTMLDivElement>(null);
    const map = useRef<maplibregl.Map | null>(null);
    const [markers, setMarkers] = useState<MarkerData[]>([]);
    const [isAddingMode, setIsAddingMode] = useState(true);

    useEffect(() => {
        (window as any).removeMarker = (markerId: string) => {
            setMarkers((prev) => {
                const markerToRemove = prev.find((marker) => marker.id === markerId);
                if (markerToRemove) {
                    markerToRemove.markerInstance.remove();
                }
                return prev.filter((marker) => marker.id !== markerId);
            });
        };
    }, []);

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

            map.current.on("load", () => {
                if (!map.current) return;

                // GeoJSONのフィーチャをループ処理してマーカーを追加
                geojson.features.forEach((feature) => {
                    // Font AwesomeアイコンをHTML文字列に変換
                    const iconHtml = renderToStaticMarkup(<FontAwesomeIcon icon={faIndustry} style={{ color: "#fb6aaeff", fontSize: "30px" }} />);

                    // HTML要素を作成し、アイコンを挿入
                    const el = document.createElement("div");
                    el.innerHTML = iconHtml;

                    // マーカーのスタイルを調整
                    el.style.transform = "translate(-50%, -100%)"; // ピンの底辺を座標に合わせる

                    // const message = feature.properties?.test || `ピン #${index + 1}`;
                    el.addEventListener("click", () => {
                        // window.alert(`GeoJSONピン: ${message}`);
                    });

                    new maplibregl.Marker({ element: el }).setLngLat(feature.geometry.coordinates as [number, number]).addTo(map.current!);
                });

                // 既存のクリックイベントを追加
                map.current.on("click", (e) => {
                    if (!isAddingMode) return;

                    const { lng, lat } = e.lngLat;
                    const newMarker: MarkerData = {
                        id: Date.now().toString(),
                        coordinates: [lng, lat],
                        timestamp: new Date(),
                        markerInstance: null as any,
                    };

                    const popupHtml = `
                        <div class="p-2">
                            <h3 class="font-bold text-sm">新しいピン</h3>
                            <p class="text-xs text-gray-600">
                                座標: ${lat.toFixed(4)}, ${lng.toFixed(4)}
                            </p>
                            <p class="text-xs text-gray-600">
                                追加時刻: ${newMarker.timestamp.toLocaleTimeString()}
                            </p>
                            <button
                                onclick="window.removeMarker('${newMarker.id}')"
                                class="mt-2 px-2 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600"
                            >
                                削除
                            </button>
                        </div>
                    `;

                    const newMarkerInstance = new maplibregl.Marker({
                        color: "#FF5722",
                        draggable: false,
                    })
                        .setLngLat([lng, lat])
                        .setPopup(new maplibregl.Popup().setHTML(popupHtml))
                        .addTo(map.current!);

                    newMarker.markerInstance = newMarkerInstance;
                    setMarkers((prev) => [...prev, newMarker]);

                    console.log("新しいピンが追加されました:", newMarker);
                });

                map.current.on("mouseenter", () => {
                    if (isAddingMode) {
                        map.current!.getCanvas().style.cursor = "crosshair";
                    }
                });

                map.current.on("mouseleave", () => {
                    map.current!.getCanvas().style.cursor = "";
                });
            });
        }

        return () => {
            if (map.current) {
                map.current.remove();
                map.current = null;
            }
        };
    }, [isAddingMode]);

    const clearAllMarkers = () => {
        markers.forEach((marker) => marker.markerInstance.remove());
        setMarkers([]);
    };

    return (
        <div className="w-full h-screen relative">
            <div ref={mapContainer} className="w-full h-full" />

            {/* コントロールパネル */}
            <div className="absolute top-4 left-4 bg-white p-4 rounded-lg shadow-lg">
                <h3 className="font-bold text-lg mb-3">ピン追加モード</h3>
                <div className="mb-3">
                    <label className="flex items-center">
                        <input type="checkbox" checked={isAddingMode} onChange={(e) => setIsAddingMode(e.target.checked)} className="mr-2" />
                        <span className="text-sm">クリックでピン追加</span>
                    </label>
                </div>
                <div className="mb-3">
                    <p className="text-sm text-gray-600">追加されたピン: {markers.length}個</p>
                </div>
                <button onClick={clearAllMarkers} className="w-full px-3 py-2 bg-red-500 text-white rounded hover:bg-red-600 text-sm">
                    全てのピンを削除
                </button>
                {isAddingMode && <p className="text-xs text-blue-600 mt-2">💡 地図をクリックしてピンを追加</p>}
            </div>

            {/* マーカーリスト */}
            <div className="absolute top-4 right-4 bg-white p-4 rounded-lg shadow-lg max-w-xs max-h-96 overflow-y-auto">
                <h4 className="font-bold text-sm mb-2">追加されたピン一覧</h4>
                {markers.length === 0 ? (
                    <p className="text-xs text-gray-500">まだピンがありません</p>
                ) : (
                    <div className="space-y-2">
                        {markers.map((marker, index) => (
                            <div key={marker.id} className="p-2 bg-gray-50 rounded text-xs">
                                <div className="font-semibold">ピン #{index + 1}</div>
                                <div className="text-gray-600">
                                    {marker.coordinates[1].toFixed(4)}, {marker.coordinates[0].toFixed(4)}
                                </div>
                                <div className="text-gray-500">{marker.timestamp.toLocaleTimeString()}</div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ClickToAddPinMap;
