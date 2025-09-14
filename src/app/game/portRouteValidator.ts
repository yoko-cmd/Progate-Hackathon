// 港間のルート検証を行うユーティリティ

export class PortRouteValidator {
    // 年度別の有効ルートマップ: Map<year, Map<fromPort, Set<toPort>>>
    private static validRoutesByYear: Map<string, Map<string, Set<string>>> = new Map();
    private static initialized = false;
    private static availableYears: string[] = [];

    // CSVデータを解析して有効なルートマップを初期化
    public static async initialize() {
        if (this.initialized) return;

        try {
            // CSVファイルを読み込み
            const response = await fetch("/port_to_port_data.csv");
            const csvText = await response.text();

            // CSVを解析
            const lines = csvText.split("\n");
            const headerLine = lines[0];

            // ヘッダーを確認
            if (!headerLine.includes("出発港") || !headerLine.includes("到着港")) {
                throw new Error("Invalid CSV format");
            }

            // データ行を処理
            for (let i = 1; i < lines.length; i++) {
                const line = lines[i].trim();
                if (!line) continue;

                const columns = line.split(",");
                if (columns.length >= 3) {
                    const year = columns[0].trim();
                    const fromPort = columns[1].trim();
                    const toPort = columns[2].trim();

                    if (year && fromPort && toPort) {
                        // 年度別のルートマップを作成
                        if (!this.validRoutesByYear.has(year)) {
                            this.validRoutesByYear.set(year, new Map());
                        }

                        const yearRoutes = this.validRoutesByYear.get(year)!;
                        if (!yearRoutes.has(fromPort)) {
                            yearRoutes.set(fromPort, new Set());
                        }
                        yearRoutes.get(fromPort)!.add(toPort);

                        // 利用可能な年を記録
                        if (!this.availableYears.includes(year)) {
                            this.availableYears.push(year);
                        }
                    }
                }
            }

            // 利用可能な年をソート
            this.availableYears.sort();

            this.initialized = true;
            console.log("Port route validator initialized with", this.validRoutesByYear.size, "years");
            console.log("Available years:", this.availableYears);
            console.log(
                "Sample routes for 2017:",
                this.validRoutesByYear.get("2017") ? Array.from(this.validRoutesByYear.get("2017")!.entries()).slice(0, 3) : "No data"
            );
        } catch (error) {
            console.error("Failed to initialize port route validator:", error);
            // エラーの場合はすべてのルートを許可
            this.initialized = true;
        }
    }

    // 指定された港間のルートが有効かどうかを確認（年度指定）
    public static isValidRoute(fromPort: string, toPort: string, year: string = "2017"): boolean {
        if (!this.initialized) {
            console.warn("PortRouteValidator not initialized");
            return true; // 初期化されていない場合は許可
        }

        // 指定された年のデータが存在しない場合は許可
        const yearRoutes = this.validRoutesByYear.get(year);
        if (!yearRoutes || yearRoutes.size === 0) {
            console.warn(`No route data for year ${year}`);
            return true;
        }

        const validDestinations = yearRoutes.get(fromPort);
        return validDestinations ? validDestinations.has(toPort) : false;
    }

    // 指定された港から行ける港のリストを取得（年度指定）
    public static getValidDestinations(fromPort: string, year: string = "2017"): string[] {
        if (!this.initialized) {
            console.warn("PortRouteValidator not initialized");
            return [];
        }

        const yearRoutes = this.validRoutesByYear.get(year);
        if (!yearRoutes) {
            return [];
        }

        const validDestinations = yearRoutes.get(fromPort);
        return validDestinations ? Array.from(validDestinations) : [];
    }

    // 利用可能な年のリストを取得
    public static getAvailableYears(): string[] {
        return [...this.availableYears];
    }

    // デバッグ用：指定年度のルートマップの状態を取得
    public static getRouteMap(year: string = "2017"): Map<string, Set<string>> {
        const yearRoutes = this.validRoutesByYear.get(year);
        return yearRoutes ? new Map(yearRoutes) : new Map();
    }
}
