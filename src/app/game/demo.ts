import { Game } from "./game";
import { DeliveryMethod } from "./types";

// ゲームのデモ用関数
export function demoGame(): void {
    console.log("=== 物流すごろくゲーム デモ ===");

    // ゲームを作成
    const game = new Game();

    // プレイヤーを追加
    const player1Id = game.addPlayer("田中太郎");
    const player2Id = game.addPlayer("佐藤花子");

    console.log(`プレイヤー1: ${player1Id}`);
    console.log(`プレイヤー2: ${player2Id}`);

    // ゲーム開始
    game.startGame();
    console.log("ゲーム開始！");

    // 数ターン実行
    for (let turn = 1; turn <= 5; turn++) {
        console.log(`\n--- ターン ${turn} ---`);

        const currentPlayer = game.getCurrentPlayer();
        console.log(`現在のプレイヤー: ${currentPlayer.name}`);
        console.log(`現在位置: ${currentPlayer.state.position}`);
        console.log(`資金: ${currentPlayer.state.money}円`);
        console.log(`CO2排出量: ${currentPlayer.state.co2Point}kg`);

        // ダイスを振る
        const diceResult = game.rollDice();
        console.log(`ダイス結果: ${diceResult.value}`);

        // プレイヤーを移動
        game.movePlayer(diceResult.value);
        console.log(`新しい位置: ${currentPlayer.state.position}`);

        // 配送イベントが発生した場合
        if (game.state === "delivery-event" && game.currentDeliveryEvent) {
            const event = game.currentDeliveryEvent;
            const fromBuilding = game.map.getBuildingById(event.fromBuildingId);
            const toBuilding = game.map.getBuildingById(event.toBuildingId);

            console.log("\n🚚 配送イベント発生！");
            console.log(`配送元: ${fromBuilding.name}`);
            console.log(`配送先: ${toBuilding.name}`);
            console.log(`荷物: ${event.cargoType} (${event.cargoWeight}kg)`);
            console.log(`緊急度: ${event.urgency}`);

            // 最適な配送方法を選択（デモ用の簡単なロジック）
            let selectedMethod: DeliveryMethod;
            if (fromBuilding.type === "port" && toBuilding.type === "port") {
                selectedMethod = "ship";
            } else if (event.urgency === "high") {
                selectedMethod = "air";
            } else {
                selectedMethod = "truck";
            }

            console.log(`選択された配送方法: ${selectedMethod}`);

            // 配送実行
            const deliveryResult = game.executeDelivery(selectedMethod);

            console.log("📊 配送結果:");
            console.log(`  成功: ${deliveryResult.success ? "はい" : "いいえ"}`);
            console.log(`  距離: ${deliveryResult.distance}km`);
            console.log(`  日数: ${deliveryResult.days}日`);
            console.log(`  費用: ${deliveryResult.cost}円`);
            console.log(`  CO2排出: ${deliveryResult.co2Emission}kg`);

            console.log(`更新後の資金: ${currentPlayer.state.money}円`);
            console.log(`累計CO2排出量: ${currentPlayer.state.co2Point}kg`);
        }

        // ゲーム終了チェック
        if (game.state === "finished") {
            console.log("\n🏁 ゲーム終了！");
            break;
        }
    }

    // 最終結果
    console.log("\n=== 最終結果 ===");
    game.players.forEach((player, index) => {
        console.log(`プレイヤー${index + 1}: ${player.name}`);
        console.log(`  最終位置: ${player.state.position}`);
        console.log(`  残り資金: ${player.state.money}円`);
        console.log(`  CO2排出量: ${player.state.co2Point}kg`);
        console.log(`  配送クレジット: ${player.state.deliveryCredit}`);
        console.log(`  完了配送: ${player.state.completedDeliveries}回`);
        console.log("");
    });
}

// 利用可能な建物一覧を表示
export function showAvailableBuildings(game: Game): void {
    console.log("\n=== 利用可能な建物 ===");

    console.log("港:");
    game.map.ports.forEach((port) => {
        console.log(`  ID: ${port.id}, 名前: ${port.name}, 座標: (${port.coords.latitude}, ${port.coords.longitude})`);
    });

    console.log("\n物流センター:");
    game.map.storages.forEach((storage) => {
        console.log(`  ID: ${storage.id}, 名前: ${storage.name}, 座標: (${storage.coords.latitude}, ${storage.coords.longitude})`);
    });
}

// 配送方法の比較
export function compareDeliveryMethods(game: Game, fromId: number, toId: number, cargoWeight: number): void {
    const event = {
        fromBuildingId: fromId,
        toBuildingId: toId,
        cargoWeight,
        cargoType: "テスト荷物",
        urgency: "medium" as const,
    };

    const methods: DeliveryMethod[] = ["truck", "ship", "air"];

    console.log("\n=== 配送方法比較 ===");
    console.log(`配送元: ${game.map.getBuildingById(fromId).name}`);
    console.log(`配送先: ${game.map.getBuildingById(toId).name}`);
    console.log(`荷物重量: ${cargoWeight}kg`);

    // 一時的にイベントを設定
    const originalEvent = game.currentDeliveryEvent;
    game.currentDeliveryEvent = event;

    methods.forEach((method) => {
        const result = game.calculateDeliveryResult(event, method);
        console.log(`\n${method.toUpperCase()}:`);
        console.log(`  距離: ${result.distance}km`);
        console.log(`  日数: ${result.days}日`);
        console.log(`  費用: ${result.cost}円`);
        console.log(`  CO2排出: ${result.co2Emission}kg`);
    });

    // 元のイベントを復元
    game.currentDeliveryEvent = originalEvent;
}
