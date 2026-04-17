import Phaser from 'phaser';
import { Miner } from './Miner';
import { MUP } from './MUP';
// Assume Dizel is imported here if you use it in the fallback, otherwise MUP works fine.

export class EnemyManager {
    private enemies: Phaser.Physics.Arcade.Group;
    private maxAggressiveSlots = 2; // Slot system
    
    // FIX: Tracker for Miner spawn cooldown to prevent crowding
    private lastMinerSpawnTime: number = 0; 

    constructor(private scene: Phaser.Scene, private gore: any, private audio: any) {
        this.enemies = this.scene.physics.add.group({ runChildUpdate: true });
    }

    public spawnWave(era: string, count: number) {
        const now = this.scene.time.now;
        let minerSpawnedThisWave = false;

        for (let i = 0; i < count; i++) {
            const x = 1200 + (i * 300); // Prevent overlapping
            const y = Phaser.Math.Between(350, 580); // Restricted road belt
            
            let enemy;
            
            if (era === '1993') {
                // Enforce max 1 Miner per wave and a strict 10-second global cooldown
                if (!minerSpawnedThisWave && (now - this.lastMinerSpawnTime > 10000)) {
                    enemy = new Miner(this.scene, x, y); // Passing matching constructor arguments
                    this.lastMinerSpawnTime = now;
                    minerSpawnedThisWave = true;
                } else {
                    // Fallback spawn if Miner is on cooldown (Using MUP per original provided script)
                    enemy = new MUP(this.scene, x, y); 
                }
            } else {
                enemy = new MUP(this.scene, x, y);
            }
            
            this.enemies.add(enemy);
        }
    }

    public update(player: any) {
        let activeAttackers = 0;
        this.enemies.getChildren().forEach((enemy: any) => {
            if (enemy.isDead) return;

            if (activeAttackers < this.maxAggressiveSlots) {
                enemy.updateAI(player); // Stalk Mode
                activeAttackers++;
            } else {
                this.flankPlayer(enemy, player); // Circle Mode
            }
        });
    }

    private flankPlayer(enemy: any, player: any) {
        const side = enemy.x > player.x ? 350 : -350;
        enemy.setVelocityX(enemy.x > player.x + side ? -80 : 80);
        // Safely play walk animation based on enemy type (handles uppercase MUP/MINER prefixes)
        const walkAnim = `${enemy.skinPrefix ? enemy.skinPrefix.toLowerCase() : enemy.enemyType}_walk`;
        if (this.scene.anims.exists(walkAnim)) {
            enemy.play(walkAnim, true);
        }
    }

    public getGroup() { return this.enemies; }
}