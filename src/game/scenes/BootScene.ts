import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
    constructor() {
        super({ key: 'BootScene' });
    }

    preload() {
        console.log("SAFE BOOT INITIATED: Generating placeholder assets to bypass Vite 404s...");

        const graphics = this.add.graphics();

        // 1. Generate Player Placeholders
        graphics.fillStyle(0xff3333, 1); // Red
        graphics.fillRect(0, 0, 64, 128);
        graphics.generateTexture('marko', 64, 128);
        graphics.clear();

        // 2. Generate Enemy Placeholders (Matches your console errors)
        graphics.fillStyle(0x0066cc, 1); // Blue
        graphics.fillRect(0, 0, 64, 128);
        graphics.generateTexture('enemies_1993', 64, 128);
        graphics.clear();

        graphics.fillStyle(0x9900ff, 1); // Purple
        graphics.fillRect(0, 0, 128, 200);
        graphics.generateTexture('boss_slobodan_93', 128, 200);
        graphics.clear();

        // 3. Generate Environment & Item Placeholders (Matches your console errors)
        graphics.fillStyle(0x555555, 1); // Gray
        graphics.fillRect(0, 0, 128, 128);
        graphics.generateTexture('kiosk', 128, 128);
        graphics.clear();

        graphics.fillStyle(0x00ff00, 1); // Green
        graphics.fillRect(0, 0, 32, 32);
        graphics.generateTexture('item_dinar', 32, 32);
        graphics.generateTexture('item_health', 32, 32);
        graphics.generateTexture('item_pickaxe', 32, 32);
        graphics.clear();

        // Generate Sky Background Placeholder
        graphics.fillStyle(0x111122, 1); // Dark Blue Night
        graphics.fillRect(0, 0, 1920, 1080);
        graphics.generateTexture('part1_sky', 1920, 1080);
        graphics.clear();

        // OVERRIDE: Prevent Phaser from crashing when it tries to play animations
        // that haven't been properly loaded from JSON atlases yet.
        const originalPlay = Phaser.GameObjects.Sprite.prototype.play;
        Phaser.GameObjects.Sprite.prototype.play = function(key: string | Phaser.Types.Animations.PlayAnimationConfig, ignoreIfPlaying?: boolean) {
            try {
                return originalPlay.call(this, key, ignoreIfPlaying);
            } catch (e) {
                // Animation doesn't exist? Fail silently and stay a colored box!
                return this;
            }
        };
    }

    create() {
        console.log("SAFE BOOT COMPLETE. Launching MainLevel...");
        this.scene.start('MainLevel');
    }
}