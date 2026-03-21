import Phaser from 'phaser';

export type BreakableType = 'crate' | 'barrel' | 'kiosk' | 'kontejner';

export class BreakableObject extends Phaser.Physics.Arcade.Sprite {
    public health: number;
    public isDead: boolean = false;

    constructor(scene: Phaser.Scene, x: number, y: number, type: BreakableType) {
        super(scene, x, y, type); 
        
        scene.add.existing(this);
        scene.physics.add.existing(this);
        
        this.setOrigin(0.5, 1);
        
        // Custom scaling to normalize the wildly different base image sizes!
        switch(type) {
            case 'barrel': this.setScale(2.5); break; // Barrel was too small
            case 'crate': this.setScale(0.8); break;  // Crate was enormous
            case 'kiosk': this.setScale(2.3); break;  // Taller than the player
            case 'kontejner': this.setScale(1.5); break;
        }
        
        const body = this.body as Phaser.Physics.Arcade.Body;
        
        // This explicitly prevents the player from sliding them around!
        body.setImmovable(true); 
        (body as any).pushable = false; 
        
        body.setSize(this.width * 0.8, 40);
        body.setOffset(this.width * 0.1, this.height - 40);

        this.health = (type === 'kiosk' || type === 'kontejner') ? 60 : 20; 
    }

    public takeDamage(amount: number) {
        if (this.health <= 0 || this.isDead) return;

        this.health -= amount;

        this.scene.tweens.add({
            targets: this,
            x: this.x + Phaser.Math.Between(-4, 4),
            duration: 50,
            yoyo: true,
            repeat: 1
        });

        this.setTintFill(0xffffff);
        this.scene.time.delayedCall(50, () => {
            this.clearTint();
        });

        (this.scene as any).playSFX(['Metal-Impact-Pick', 'Metal-Impact-Shield']);

        if (this.health <= 0) {
            this.shatter();
        }
    }

    private shatter() {
        this.isDead = true;
        
        // Immediately disable the physics body so the player can walk through it
        if (this.body) {
            (this.body as Phaser.Physics.Arcade.Body).enable = false;
        }
        
        (this.scene as any).playSFX(['Break_1', 'Break_2', 'Break_3']);

        if (this.texture.key === 'kiosk' || this.texture.key === 'kontejner') {
            this.scene.cameras.main.shake(150, 0.005); 
        }

        // Use displayHeight to spawn the explosion at the correct visual center
        (this.scene as any).spawnHitEffect(this.x, this.y - (this.displayHeight / 2));

        // 100% chance to drop an item now!
        (this.scene as any).dropItem(this.x, this.y);
        
        // The Red Blink & Fade Out
        this.setTintFill(0xff0000);
        this.scene.tweens.add({
            targets: this,
            alpha: 0,
            duration: 300,
            onComplete: () => {
                this.destroy();
            }
        });
    }
}