import Phaser from 'phaser';

export type BreakableType = 'crate' | 'barrel' | 'kiosk' | 'kontejner';

/**
 * BreakableObject: Handles environmental hazards and loot containers.
 */
export class BreakableObject extends Phaser.Physics.Arcade.Sprite {
    public health: number;
    public isDead: boolean = false;

    constructor(scene: Phaser.Scene, x: number, y: number, type: BreakableType) {
        // Assumes your BootScene loaded images with keys matching the BreakableType exactly
        super(scene, x, y, type); 
        
        scene.add.existing(this);
        scene.physics.add.existing(this);
        
        this.setOrigin(0.5, 1);
        
        const body = this.body as Phaser.Physics.Arcade.Body;
        body.setImmovable(true); 
        body.setSize(this.width * 0.8, 30);
        body.setOffset(this.width * 0.1, this.height - 30);

        // Crates/Barrels take 1-2 hits. Kiosks/Kontejners take 4-5 hits.
        this.health = (type === 'kiosk' || type === 'kontejner') ? 60 : 20; 
    }

    /**
     * Matches the exact signature of our Enemy takeDamage methods
     * so the players can punch them seamlessly.
     */
    public takeDamage(amount: number) {
        if (this.health <= 0 || this.isDead) return;

        this.health -= amount;

        // Kinetic shake feedback
        this.scene.tweens.add({
            targets: this,
            x: this.x + Phaser.Math.Between(-4, 4),
            duration: 50,
            yoyo: true,
            repeat: 1
        });

        // Flash white when hit
        this.setTintFill(0xffffff);
        this.scene.time.delayedCall(50, () => {
            this.clearTint();
        });

        // Use our existing metal impact sounds
        (this.scene as any).playSFX(['Metal-Impact-Pick', 'Metal-Impact-Shield']);

        if (this.health <= 0) {
            this.shatter();
        }
    }

    private shatter() {
        this.isDead = true;
        
        // Play era-appropriate destruction sound
        (this.scene as any).playSFX(['Break_1', 'Break_2', 'Break_3']);

        // Slight screen shake for heavy objects breaking
        if (this.texture.key === 'kiosk' || this.texture.key === 'kontejner') {
            this.scene.cameras.main.shake(150, 0.005); 
        }

        // Spawn explosion effect instead of gore
        (this.scene as any).spawnHitEffect(this.x, this.y - (this.height / 2));

        // 60% chance to drop a Burek, Coffee, etc. using our existing unified loot system!
        if (Phaser.Math.Between(1, 100) <= 60) {
            (this.scene as any).dropItem(this.x, this.y);
        }
        
        this.destroy();
    }
}