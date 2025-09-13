# 物流すごろくゲーム

日本地図上で物流の最適化を学ぶすごろくゲームです。

## ゲームの概要

- プレイヤーは日本各地の物流拠点をすごろくのマスとして移動します
- 各マスに止まると配送イベントが発生し、最適な配送手段を選択する必要があります
- CO2排出量、配送費用、配送日数を考慮して最適な選択をする必要があります

## 主な機能

### ゲーム要素
- **すごろく移動**: ダイスを振って物流拠点間を移動
- **配送イベント**: 各拠点で荷物の配送任務が発生
- **配送手段選択**: トラック、船、航空便から最適な手段を選択

### 配送手段の特徴
- **トラック**: 一般的な陸上輸送、適度なコストとCO2排出
- **船**: 長距離・大量輸送に適している、CO2排出量が少ない
- **航空便**: 高速配送、高コスト・高CO2排出

### スコア要素
- **資金**: 配送費用で減少、効率的な配送で節約
- **CO2排出量**: 環境への影響を数値化
- **配送クレジット**: 最適な選択でボーナス獲得

## ファイル構成

```
src/app/game/
├── types.ts     # 型定義
├── game.ts      # ゲームロジック
└── demo.ts      # デモ・テスト用コード
```

## 使用方法

### 基本的なゲームの流れ

```typescript
import { Game } from "./game";

// ゲーム作成
const game = new Game();

// プレイヤー追加
const player1 = game.addPlayer("田中太郎");
const player2 = game.addPlayer("佐藤花子");

// ゲーム開始
game.startGame();

// ターンループ
while (game.state !== "finished") {
    // ダイスを振る
    const diceResult = game.rollDice();
    
    // プレイヤーを移動
    game.movePlayer(diceResult.value);
    
    // 配送イベントが発生した場合
    if (game.state === "delivery-event") {
        const event = game.currentDeliveryEvent;
        
        // 配送方法を選択（例：トラック）
        const result = game.executeDelivery("truck");
        
        console.log("配送完了:", result);
    }
}
```

### デモの実行

```typescript
import { demoGame, showAvailableBuildings, compareDeliveryMethods } from "./demo";

// ゲームデモを実行
demoGame();

// 利用可能な建物を確認
const game = new Game();
showAvailableBuildings(game);

// 配送方法の比較
compareDeliveryMethods(game, 13, 16, 500); // 東京→大阪、500kg
```

## 日本地図データ

### 港（5箇所）
- 横浜港
- 神戸港  
- 名古屋港
- 博多港
- 仙台港

### 物流センター（10箇所）
- 札幌物流センター
- 仙台物流センター
- 東京物流センター
- 横浜物流センター
- 名古屋物流センター
- 大阪物流センター
- 神戸物流センター
- 広島物流センター
- 福岡物流センター
- 鹿児島物流センター

## 配送最適化のヒント

1. **港間の配送**: 船を使用すると最も効率的
2. **緊急配送**: 航空便が最適だが高コスト
3. **一般配送**: トラックが基本的に最適
4. **距離とコスト**: 長距離では船が経済的
5. **環境配慮**: CO2排出量も考慮して選択

## 今後の拡張予定

- [ ] より詳細な日本地図データ
- [ ] 天候による配送影響
- [ ] 複数プレイヤー対戦機能
- [ ] UI/UXの実装
- [ ] 統計・分析機能
- [ ] 難易度設定
