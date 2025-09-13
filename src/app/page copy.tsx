"use client";

import { useEffect, useState } from "react";
import Map from "./Map";

type PrefBox = {
  code: string;
  x: number;
  y: number;
};

function getCityCoords(code: string): { x: number; y: number } | undefined {
  const svg = document.querySelector("svg.geolonia-svg-map");
  if (!svg) return undefined;

  // 都道府県グループを取得
  const pref = svg.querySelector<SVGGraphicsElement>(`.prefecture[data-code="${code}"]`);
  if (!pref) return undefined;

  // SVGのviewBox情報を取得
  const viewBox = svg.getAttribute("viewBox")?.split(" ").map(Number);
  if (!viewBox || viewBox.length !== 4) return undefined;
  const [vbX, vbY, vbW, vbH] = viewBox;

  // 都道府県グループの境界ボックスを取得
  const bbox = pref.getBBox();

  // 相対座標（0〜1）で返す
  return {
    x: (bbox.x + bbox.width / 2 - vbX) / vbW,
    y: (bbox.y + bbox.height / 2 - vbY) / vbH,
  };
}

export default function Home() {
  const [centers, setCenters] = useState<PrefBox[]>([]);

  useEffect(() => {
    // 初期描画時に都道府県の中央座標を取得
    const container = document.querySelector("#map");
    if (!container) return;

    const svgMap = container.querySelector("g.svg-map");
    if (!svgMap) return;

    const generateCenter = () => {
      const mapRect = container.getBoundingClientRect();
      const svgRect = svgMap.getBoundingClientRect();
      const prefectures = container.querySelectorAll<SVGGraphicsElement>(".prefecture");
      const arr: PrefBox[] = [];
      prefectures.forEach((pref) => {
        const code = pref.dataset.code || "";
        if (getCityCoords[code]) {
          arr.push({
            code,
            x: svgRect.left + getCityCoords[code].x * svgRect.width - mapRect.left,
            y: svgRect.top + getCityCoords[code].y * svgRect.height - mapRect.top
          });
          return;
        }
        const rect = pref.getBoundingClientRect();
        arr.push({
          code,
          x: rect.left + rect.width / 2 - mapRect.left,
          y: rect.top + rect.height / 2 - mapRect.top,
        });
      });
      setCenters(arr);
    }

    generateCenter();

    window.addEventListener("resize", generateCenter);


  }, []);

  return (
    <div className="relative w-screen h-screen">
      <div id="map" className="w-full h-full">
        <Map />
        {/* すべての都道府県の中央を直線で結ぶ */}
        <svg
          id="line"
          className="absolute pointer-events-none"
          style={{ left: 0, top: 0, width: "100%", height: "100%", zIndex: 9 }}
        >
          {centers.length > 1 &&
            centers.flatMap((from, i) =>
              centers.slice(i + 1).map((to, j) => (
                <line
                  key={`${from.code}-${to.code}`}
                  x1={from.x}
                  y1={from.y}
                  x2={to.x}
                  y2={to.y}
                  stroke="#5dade2"
                  strokeWidth={1}
                  opacity={0.5}
                />
              ))
            )}
        </svg>
      </div>
    </div>
  );
}