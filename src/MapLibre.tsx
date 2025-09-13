import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";

export default function MapLibre() {
  const mapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const apiKey = "v1.public.eyJqdGkiOiIwNWQyMDA2ZS03NDhmLTQxOGMtODJkYy1jNWM4ODJmZDkzZDcifVb9MrYI5A38BVQk3n1fNHkfAyB_krRcGB4qTtv4Bv4Vx1sM8OHdWIqs7YTjCqSMvCv5bAfnwh-XkKUzsuFVt7viAVfZTta5_gImKyWq02FEY4apd5dbCOsetaf7E5t16W-_79EwsaBnnVewhCsW1pUTvxfpIjldqzuf79gFmNyhVPoaiStogv6hDAODfkBju1hUVDS_nZwSuKHoY5tvOz6vvGh2HKNxdbf2_5ZvTG7pC7NeSWA6gLhaADLFiAF7ecZuMCaVGFuE8_Fr0JvmA9hlP0aPQ3XY2CGJLcOrkB8GsqKGWcY7DSqCmKWW_kEV_rq_xwFvY2PfAX84_SVwsqM.ZWU0ZWIzMTktMWRhNi00Mzg0LTllMzYtNzlmMDU3MjRmYTkx";
    const region = "us-east-1";
    const style = "Standard";
    const colorScheme = "Light";

    if (!mapRef.current) return;

    const map = new maplibregl.Map({
      container: mapRef.current,
      style: `https://maps.geo.${region}.amazonaws.com/v2/styles/${style}/descriptor?key=${apiKey}&color-scheme=${colorScheme}`,
      center: [139.6917, 35.6895], // 東京
      zoom: 5,
    });

    map.addControl(new maplibregl.NavigationControl(), "top-left");

    return () => {
      map.remove();
    };
  }, []);

  return <div ref={mapRef} style={{ width: "100vw", height: "100vh" }} />;
}