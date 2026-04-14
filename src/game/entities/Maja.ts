import Phaser from 'phaser';
import { CHARACTER_STATS } from '../config/CharacterStats';

export class Maja extends Phaser.Physics.Arcade.Sprite {

    public health: number = CHARACTER_STATS.maja_1993.maxHealth; // [cite: 816]
    public maxHealth: number = CHARACTER_STATS.maja_1993.maxHealth; // [cite: 816]
    public smfMeter: number = 0; // [cite: 816]
    public characterName: string = 'maja'; // [cite: 816]
    public damageMultiplier: number = CHARACTER_STATS.maja_1993.hitDamage / 12; // [cite: 816]
    
    public isAttacking: boolean = false; // [cite: 816]
    public isDead: boolean = false; // [cite: 816]
    public isJumping: boolean = false; // [cite: 816]
    
    public equippedWeapon: string | null = null; // [cite: 816]
    public weaponDurability: number = 0; // [cite: 816]
    public weaponHitsTaken: number = 0; // [cite: 816]
    private weaponSprite: Phaser.GameObjects.Sprite | null = null; // [cite: 816]
    
    private weaponOffsets: Record<string, { x: number, y: number, angle: number }> = { // [cite: 816]
        'idle': { x: 35, y: -130, angle: 10 },
        'walk': { x: 40, y: -135, angle: 15 },
        'run': { x: 50, y: -130, angle: 25 },
        'jump': { x: 10, y: -220, angle: -10 },
        'shoot': { x: 30, y: -220, angle: 0 }
    };
    
    private currentVoice: any = null; // [cite: 817]
    private walkSpeed: number = CHARACTER_STATS.maja_1993.baseSpeed; // [cite: 817]
    private runSpeed: number = CHARACTER_STATS.maja_1993.runSpeed; // [cite: 817]
    private jumpVelocityX: number = 0; // [cite: 817]
    
    private lastKey: string = ''; // [cite: 817]
    private lastKeyTime: number = 0; // [cite: 817]
    private isRunning: boolean = false; // [cite: 817]
    private queuedAction: string | null = null; // [cite: 817]
    
    private punchImpacts = ['punch_1', 'punch_2', 'punch_3', 'punch_4', 'punch_5', 'punch_6', 'punch_7', 'punch_8']; // [cite: 817]
    private kickImpacts = ['kick_1', 'kick_2', 'kick_3', 'kick_4']; // [cite: 817]
    private grunts = ['grunt_f_1', 'grunt_f_2', 'grunt_f_3', 'grunt_f_4']; // [cite: 817]
    private agonies = ['agony_f_1', 'agony_f_2']; // [cite: 817]

    constructor(scene: Phaser.Scene, x: number, y: number) { // [cite: 817]
        const texture = scene.textures.get('maja'); // [cite: 818]
        const allFrames = texture ? texture.getFrameNames() : []; // [cite: 818]
        const firstFrame = allFrames.find(f => f.includes('maja-idle')) || allFrames; // [cite: 818]
        
        super(scene, x, y, 'maja', firstFrame); // [cite: 818]
        
        scene.add.existing(this); // [cite: 818]
        scene.physics.add.existing(this); // [cite: 818]
        
        this.setOrigin(0.5, 1); // [cite: 818]
        this.setScale(1.7); // [cite: 818]
        
        if (this.body) { // [cite: 818]
            this.body.setSize(60, 30); // [cite: 818]
            this.body.setOffset(this.width / 2 - 30, this.height - 30); // [cite: 818]
            (this.body as Phaser.Physics.Arcade.Body).setAllowRotation(false); // [cite: 818]
        }
        
        this.createAnimations(); // [cite: 818]
    }

    private safeCall(methodName: string, ...args: any[]) { // [cite: 818]
        if (this.scene && typeof (this.scene as any)[methodName] === 'function') { // [cite: 818]
            return (this.scene as any)[methodName](...args); // [cite: 818]
        }
        return null; // [cite: 819]
    }

    private createAnimations() { // [cite: 819]
        const anims = this.scene.anims; // [cite: 819]
        if (anims.exists(`${this.characterName}-idle`)) return; // [cite: 819]
        
        const texture = this.scene.textures.get(this.characterName); // [cite: 819]
        if (!texture || texture.key === '__MISSING') return; // [cite: 819]
        
        const allFrames = texture.getFrameNames(); // [cite: 819]
        
        const animTypes = [ // [cite: 819]
            'idle', 'walk', 'run', 'jump', 'punch-1', 'punch-2', 'kick-1', 'kick-2', // [cite: 819]
            'melee', 'jump-punch', 'jump-kick', 'special-attack', 'finish-move', // [cite: 819]
            'throw', 'damage', 'knockdown-get-up', 'dying', 'pick-up', // [cite: 819]
            'shoot', 'shoot-recoil', 'shoot-up', 'shoot-with-rifle', 'walk-rifle' // [cite: 819]
        ];

        animTypes.forEach(animType => { // [cite: 819]
            const animKey = `${this.characterName}-${animType}`; // [cite: 819]
            if (anims.exists(animKey)) return; // [cite: 819]
            
            const searchStr = `${animKey}/frame_`; // [cite: 820]
            const matchingFrames = allFrames.filter(f => f.includes(searchStr)).sort(); // [cite: 820]
            
            if (matchingFrames.length > 0) { // [cite: 820]
                let fps = 15; // [cite: 820]
                if (animType === 'idle') fps = 6; // [cite: 820]
                else if (animType === 'walk' || animType === 'walk-rifle') fps = 12; // [cite: 820]
                else if (animType === 'run') fps = 18; // [cite: 820]
                else if (animType === 'jump') fps = 8; // [cite: 820]
                
                const frameConfig = matchingFrames.map(f => { // [cite: 820]
                    return { key: this.characterName, frame: f }; // [cite: 820]
                });
                
                if (animType === 'finish-move' && frameConfig.length > 0) { // [cite: 820]
                    const lastFrame = frameConfig[frameConfig.length - 1]; // [cite: 820]
                    for (let i = 0; i < 8; i++) { // [cite: 820]
                        frameConfig.push(lastFrame); // [cite: 820]
                    }
                }
                
                anims.create({ // [cite: 820]
                    key: animKey, // [cite: 821]
                    frames: frameConfig, // [cite: 821]
                    frameRate: fps, // [cite: 821]
                    repeat: (animType === 'idle' || animType === 'walk' || animType === 'run') ? -1 : 0 // [cite: 821]
                });
            }
        });
    }

    public equipWeapon(weaponKey: string) { // [cite: 821]
        if (this.weaponSprite) this.weaponSprite.destroy(); // [cite: 821]
        this.equippedWeapon = weaponKey; // [cite: 821]
        this.weaponHitsTaken = 0; // [cite: 821]
        
        if (weaponKey === 'M70-FINAL rev') { // [cite: 821]
            this.weaponDurability = 5; // [cite: 821]
            this.weaponSprite = null; // [cite: 821]
        } else {
            this.weaponDurability = 5; // [cite: 821]
            this.weaponSprite = this.scene.add.sprite(this.x, this.y, weaponKey); // [cite: 821]
            (this.weaponSprite as any).isWeaponSprite = true; // [cite: 821]
            this.weaponSprite.setScale(1.3); // [cite: 821]
            this.weaponSprite.setOrigin(0.5, 0.8); // [cite: 822]
        }
    }

    private dropAndFadeWeapon() { // [cite: 822]
        if (!this.equippedWeapon) return; // [cite: 822]
        
        const drop = this.scene.add.sprite(this.x, this.y - 250, this.equippedWeapon); // [cite: 822]
        if (this.equippedWeapon === 'M70-FINAL rev') drop.setScale(1.0); // [cite: 822]
        else drop.setScale(1.3); // [cite: 822]
        
        drop.setFlipX(this.flipX); // [cite: 822]
        
        this.scene.tweens.add({ // [cite: 822]
            targets: drop, // [cite: 822]
            y: this.y - 20, // [cite: 822]
            x: this.x + (this.flipX ? -80 : 80), // [cite: 822]
            angle: this.flipX ? -90 : 90, // [cite: 822]
            duration: 500, // [cite: 822]
            ease: 'Bounce.easeOut' // [cite: 822]
        });
        
        this.scene.tweens.add({ // [cite: 822]
            targets: drop, // [cite: 823]
            alpha: 0, // [cite: 823]
            duration: 500, // [cite: 823]
            delay: 1500, // [cite: 823]
            onComplete: () => drop.destroy() // [cite: 823]
        });
        
        this.equippedWeapon = null; // [cite: 823]
        if (this.weaponSprite) { // [cite: 823]
            this.weaponSprite.destroy(); // [cite: 823]
            this.weaponSprite = null; // [cite: 823]
        }
    }

    private positionWeaponSprite() { // [cite: 823]
        if (!this.weaponSprite || !this.equippedWeapon) return; // [cite: 823]
        
        this.weaponSprite.visible = true; // [cite: 823]
        
        const currentAnimKey = this.anims.currentAnim?.key.replace(`${this.characterName}-`, '') || 'idle'; // [cite: 823]
        const currentFrameName = this.frame.name; // [cite: 823]
        const dirX = this.flipX ? -1 : 1; // [cite: 823]
        const jumpVisualOffset = this.height - this.displayOriginY; // [cite: 824]
        
        let targetX = this.x; // [cite: 824]
        let targetY = this.y + jumpVisualOffset; // [cite: 824]
        let targetAngle = 0; // [cite: 824]
        let targetDepth = this.depth + 1; // [cite: 824]
        
        // Hide weapon during specials and heavy moves
        if (['kick-2', 'special-attack', 'finish-move', 'jump-punch', 'jump-kick'].includes(currentAnimKey) || currentFrameName.includes('pick-up')) { // [cite: 824]
            this.weaponSprite.visible = false; // [cite: 824]
            return; // [cite: 824]
        }

        // Weapon offset logic based on Maja's specific frames [cite: 824-828]
        if (currentAnimKey === 'walk') {
            if (currentFrameName.includes('001') || currentFrameName.includes('002') || currentFrameName.includes('003')) {
                targetX += (20 * dirX); targetY -= 220; targetAngle = 25 * dirX;
            } else if (currentFrameName.includes('005') || currentFrameName.includes('006') || currentFrameName.includes('007')) {
                targetX += (-5 * dirX); targetY -= 220; targetAngle = -10 * dirX;
            } else {
                targetX += (10 * dirX); targetY -= 220; targetAngle = 5 * dirX;
            }
        } else {
            const offset = this.weaponOffsets[currentAnimKey] || this.weaponOffsets['idle']; // [cite: 828]
            targetX += (offset.x * dirX); // [cite: 828]
            targetY += offset.y; // [cite: 828]
            targetAngle = offset.angle * dirX; // [cite: 828]
            targetDepth = this.depth + 1; // [cite: 828]
        }
        
        this.weaponSprite.setPosition(targetX, targetY); // [cite: 829]
        this.weaponSprite.setAngle(targetAngle); // [cite: 829]
        this.weaponSprite.setFlipX(this.flipX); // [cite: 829]
        this.weaponSprite.setDepth(targetDepth); // [cite: 829]
    }

    private throwWeapon() { // [cite: 829]
        if (!this.equippedWeapon) return; // [cite: 829]
        
        const dirX = this.flipX ? -1 : 1; // [cite: 829]
        this.safeCall('spawnProjectile', this.y, this.x + (20 * dirX), this.y - 120, this.equippedWeapon, dirX, 50, true); // [cite: 829]
        
        this.equippedWeapon = null; // [cite: 829]
        if (this.weaponSprite) { // [cite: 829]
            this.weaponSprite.destroy(); // [cite: 829]
            this.weaponSprite = null; // [cite: 829]
        }
    }

    private executeWeaponAttack() { // [cite: 829]
        this.isAttacking = true; // [cite: 829]
        this.setVelocity(0, 0); // [cite: 829]
        
        if (this.equippedWeapon === 'M70-FINAL rev') { // [cite: 830]
            if (this.scene.anims.exists(`${this.characterName}-shoot-with-rifle`)) { // [cite: 830]
                this.play(`${this.characterName}-shoot-with-rifle`, true); // [cite: 830]
            } else if (this.scene.anims.exists(`${this.characterName}-shoot`)) { // [cite: 830]
                this.play(`${this.characterName}-shoot`, true); // [cite: 830]
            }
            
            const dirX = this.flipX ? -1 : 1; // [cite: 830]
            this.safeCall('playSFX', 'gun-shot-m70', 1.0); // [cite: 830]
            
            const spawnX = this.x + (180 * dirX); // [cite: 830]
            const flashX = this.x + (200 * dirX); // [cite: 830]
            const spawnY = this.y - 270; // [cite: 830]
            
            this.safeCall('spawnProjectile', this.y, spawnX, spawnY, 'bullet', dirX, 60, false); // [cite: 830]
            
            const flash = this.scene.add.sprite(flashX, spawnY, 'muzzle-flash-m70'); // [cite: 830]
            flash.setDepth(9999); // [cite: 830]
            flash.setFlipX(this.flipX); // [cite: 830]
            flash.setScale(1.2); // [cite: 830]
            flash.setBlendMode(Phaser.BlendModes.ADD); // [cite: 830]
            
            this.scene.tweens.add({ targets: flash, alpha: 0, duration: 100, onComplete: () => flash.destroy() }); // [cite: 831]
            this.scene.cameras.main.shake(100, 0.01); // [cite: 831]
            
            this.weaponDurability--; // [cite: 831]
            if (this.weaponDurability <= 0) { // [cite: 831]
                this.scene.time.delayedCall(150, () => { // [cite: 831]
                    this.dropAndFadeWeapon(); // [cite: 831]
                    this.scene.time.delayedCall(300, () => { this.isAttacking = false; }); // [cite: 831]
                });
            } else {
                this.scene.time.delayedCall(300, () => { this.isAttacking = false; }); // [cite: 831]
            }
        } else {
            this.weaponDurability--; // [cite: 831]
            if (this.weaponDurability <= 0) { // [cite: 831]
                this.scene.time.delayedCall(100, () => this.dropAndFadeWeapon()); // [cite: 831]
                this.play(`${this.characterName}-punch-2`, true); // [cite: 831]
                this.once('animationcomplete', () => { this.isAttacking = false; }); // [cite: 831]
                return; // [cite: 831]
            }
            
            const animToPlay = this.scene.anims.exists(`${this.characterName}-melee`) ? `${this.characterName}-melee` : `${this.characterName}-punch-2`; // [cite: 832]
            this.play(animToPlay, true); // [cite: 832]
            
            const hitZone = this.scene.add.zone(this.x + (this.flipX ? -80 : 80), this.y - 60, 160, 100); // [cite: 832]
            this.scene.physics.add.existing(hitZone); // [cite: 832]
            
            let hasHit = false; // [cite: 832]
            const targets = [(this.scene as any).enemies, (this.scene as any).breakables]; // [cite: 832]
            
            this.scene.physics.add.overlap(hitZone, targets, (hz, target: any) => { // [cite: 832]
                const yTol = target.isBreakable ? 140 : 60; // [cite: 832]
                if (Math.abs(this.y - target.y) <= yTol) { // [cite: 832]
                    if (!hasHit) { // [cite: 832]
                        this.safeCall('playSFX', ['punch_4', 'punch_5']); // [cite: 832]
                        hasHit = true; // [cite: 832]
                    }
                    const hitX = (this.x + target.x) / 2; // [cite: 832]
                    this.safeCall('spawnBlood', hitX, target.y - 50); // [cite: 832]
                    if (hitZone.body) (hitZone.body as Phaser.Physics.Arcade.Body).enable = false; // [cite: 833]
                }
            });
            
            this.once('animationcomplete', () => { // [cite: 833]
                if (hitZone.active) hitZone.destroy(); // [cite: 833]
                this.isAttacking = false; // [cite: 833]
            });
        }
    }

    private playVoice(marker: string | string[]) { // [cite: 833]
        if (this.currentVoice && this.currentVoice.isPlaying) this.currentVoice.stop(); // [cite: 833]
        this.currentVoice = this.safeCall('playSFX', marker); // [cite: 833]
    }

    public playPickupAnim() { // [cite: 833]
        if (this.isDead || this.isJumping || this.isAttacking) return; // [cite: 833]
        this.isAttacking = true; // [cite: 833]
        this.setVelocity(0, 0); // [cite: 833]
        this.anims.stop(); // [cite: 833]
        this.setFrame('maja-pick-up/frame_001.png'); // [cite: 834]
        this.setTintFill(0x39ff14); // [cite: 834]
        this.scene.time.delayedCall(100, () => this.clearTint()); // [cite: 834]
        this.scene.time.delayedCall(300, () => { // [cite: 834]
            this.isAttacking = false; // [cite: 834]
        });
    }

    public update(input: any) { // [cite: 834]
        if (this.isDead) return; // [cite: 834]
        
        this.setAngle(0); // [cite: 834]
        const currentAnimKeyForScale = this.anims.currentAnim?.key || ''; // [cite: 834]
        const currentFrameName = this.frame.name; // [cite: 834]
        
        if (currentAnimKeyForScale.includes('walk-rifle')) { // [cite: 834]
            this.setScale(1.59); // [cite: 834]
        } else if (currentFrameName.includes('pick-up')) { // [cite: 834]
            this.setScale(1.9); // [cite: 834]
        } else {
            this.setScale(1.7); // [cite: 834]
        }
        
        this.positionWeaponSprite(); // [cite: 835]
        
        // --- JUMP LOGIC ---
        if (input.space && !this.isJumping && !this.isAttacking) { // [cite: 835]
            this.isJumping = true; // [cite: 835]
            
            if (input.left) this.jumpVelocityX = -this.runSpeed * 1.2; // [cite: 835]
            else if (input.right) this.jumpVelocityX = this.runSpeed * 1.2; // [cite: 835]
            else this.jumpVelocityX = 0; // [cite: 835]

            if (this.scene.anims.exists(`${this.characterName}-jump`)) { // [cite: 835]
                this.play(`${this.characterName}-jump`, true); // [cite: 835]
            }

            const startOriginY = this.displayOriginY; // [cite: 835]
            this.scene.tweens.add({ // [cite: 835]
                targets: this, // [cite: 835]
                displayOriginY: startOriginY + 220, // [cite: 835]
                duration: 400, // [cite: 835]
                yoyo: true, // [cite: 835]
                ease: 'Quad.easeOut', // [cite: 835]
                onComplete: () => { // [cite: 835]
                    this.isJumping = false; // [cite: 836]
                    this.displayOriginY = startOriginY; // [cite: 836]
                    if (!this.isAttacking && this.scene.anims.exists(`${this.characterName}-idle`)) { // [cite: 836]
                        this.play(`${this.characterName}-idle`, true); // [cite: 836]
                    }
                }
            });
        }

        const now = this.scene.time.now; // [cite: 836]
        if (input.left || input.right) { // [cite: 836]
            const dir = input.left ? 'left' : 'right'; // [cite: 836]
            if (this.lastKey !== dir) { // [cite: 836]
                if (now - this.lastKeyTime < 250) this.isRunning = true; // [cite: 836]
                this.lastKey = dir; this.lastKeyTime = now; // [cite: 836]
            }
        } else { this.isRunning = false; this.lastKey = ''; } // [cite: 836]

        let requestedAction: string | null = null; // [cite: 836]
        if (input.special) requestedAction = 'special'; // [cite: 836]
        else if (input.finisher) requestedAction = 'finisher'; // [cite: 836]
        else if (input.p1) requestedAction = 'punch-1'; // [cite: 836]
        else if (input.p2) requestedAction = 'punch-2'; // [cite: 836]
        else if (input.k1) requestedAction = 'kick-1'; // [cite: 836]
        else if (input.k2) requestedAction = 'kick-2'; // [cite: 836]

        if (requestedAction) { // [cite: 837]
            if (this.isJumping && !this.isAttacking) { // [cite: 837]
                if (requestedAction.includes('punch') || requestedAction.includes('kick')) { // [cite: 837]
                    this.executeJumpAttack(requestedAction); // [cite: 837]
                }
            } else if (!this.isJumping) { // [cite: 837]
                if (this.isAttacking && (requestedAction === 'special' || requestedAction === 'finisher')) { // [cite: 837]
                    this.isAttacking = false; // [cite: 837]
                    const oldZone = this.scene.children.getByName('basicAttackZone'); // [cite: 837]
                    if (oldZone) oldZone.destroy(); // [cite: 837]
                }
                
                if (!this.isAttacking) { // [cite: 837]
                    if (this.equippedWeapon && (requestedAction === 'punch-1' || requestedAction === 'punch-2')) { // [cite: 837]
                        this.executeWeaponAttack(); // [cite: 837]
                    } else {
                        this.executeAction(requestedAction); // [cite: 837]
                    }
                } else {
                    this.queuedAction = requestedAction; // [cite: 837]
                }
            }
            return; // [cite: 838]
        }

        if (!this.isAttacking) { // [cite: 838]
            let vx = 0; let vy = 0; // [cite: 838]
            if (this.isJumping) { // [cite: 838]
                vx = this.jumpVelocityX; // [cite: 838]
            } else {
                const speed = this.isRunning ? this.runSpeed : this.walkSpeed; // [cite: 838]
                vx = input.left ? -speed : (input.right ? speed : 0); // [cite: 838]
                vy = input.up ? -speed * 0.6 : (input.down ? speed * 0.6 : 0); // [cite: 838]
            }
            
            this.setVelocity(vx, vy); // [cite: 838]
            if (vx !== 0) this.setFlipX(vx < 0); // [cite: 838]
            
            if (!this.isJumping) { // [cite: 838]
                if (vx !== 0 || vy !== 0) { // [cite: 838]
                    if (this.isRunning) { // [cite: 838]
                        this.play(`${this.characterName}-run`, true); // [cite: 838]
                    } else {
                        if (this.equippedWeapon === 'M70-FINAL rev' && this.scene.anims.exists(`${this.characterName}-walk-rifle`)) { // [cite: 839]
                            this.play(`${this.characterName}-walk-rifle`, true); // [cite: 839]
                        } else {
                            this.play(`${this.characterName}-walk`, true); // [cite: 839]
                        }
                    }
                } else {
                    if (this.equippedWeapon === 'M70-FINAL rev' && this.scene.anims.exists(`${this.characterName}-shoot-with-rifle`)) { // [cite: 839]
                        this.play(`${this.characterName}-shoot-with-rifle`, true); // [cite: 839]
                    } else {
                        this.play(`${this.characterName}-idle`, true); // [cite: 839]
                    }
                }
            }
        } else {
            if (this.isJumping) { // [cite: 839]
                this.setVelocity(this.jumpVelocityX, 0); // [cite: 839]
            }
        }
    }

    private executeJumpAttack(action: string) { // [cite: 839]
        this.isAttacking = true; // [cite: 840]
        const type = action.includes('punch') ? 'jump-punch' : 'jump-kick'; // [cite: 840]
        const animToPlay = `${this.characterName}-${type}`; // [cite: 840]
        
        if (this.scene.anims.exists(animToPlay)) this.play(animToPlay, true); // [cite: 840]
        else if (this.scene.anims.exists(`${this.characterName}-kick-1`)) this.play(`${this.characterName}-kick-1`, true); // [cite: 840]
        
        const hitZone = this.scene.add.zone(this.x + (this.flipX ? -60 : 60), this.y - 100, 140, 90); // [cite: 840]
        this.scene.physics.add.existing(hitZone); // [cite: 840]
        
        let hasHit = false; // [cite: 840]
        const targets = [(this.scene as any).enemies, (this.scene as any).breakables]; // [cite: 840]
        
        this.scene.physics.add.overlap(hitZone, targets, (hz, target: any) => { // [cite: 840]
            const yTol = target.isBreakable ? 140 : 60; // [cite: 840]
            if (Math.abs(this.y - target.y) <= yTol) { // [cite: 840]
                if (!hasHit) { // [cite: 840]
                    this.safeCall('playSFX', action.includes('punch') ? this.punchImpacts : this.kickImpacts); // [cite: 840]
                    hasHit = true; // [cite: 840]
                }
                const damage = 15 * this.damageMultiplier; // [cite: 840]
                const hitX = (this.x + target.x) / 2; // [cite: 840]
                this.safeCall('spawnHitEffect', hitX, target.y - 80); // [cite: 841]
                
                if (target.takeDamage) target.takeDamage(damage); // [cite: 841]
                if (hitZone.body) (hitZone.body as Phaser.Physics.Arcade.Body).enable = false; // [cite: 841]
            }
        });
        
        this.once('animationcomplete', () => { // [cite: 841]
            if (hitZone.active) hitZone.destroy(); // [cite: 841]
            this.isAttacking = false; // [cite: 841]
        });
    }

    private executeAction(action: string) { // [cite: 841]
        // REPLACED executeBalkanSuplex with executeGroundSlam
        if (action === 'special') { this.executeGroundSlam(); return; } // [cite: 841]
        if (action === 'finisher') { this.executeIndustrialDrill(); return; } // [cite: 841]
        
        this.isAttacking = true; this.setVelocity(0, 0); // [cite: 841]
        const animToPlay = `${this.characterName}-${action}`; // [cite: 841]
        
        if (this.scene.anims.exists(animToPlay)) this.play(animToPlay, true); // [cite: 841]
        
        const hitZone = this.scene.add.zone(this.x + (this.flipX ? -80 : 80), this.y - 40, 140, 80); // [cite: 841]
        hitZone.setName('basicAttackZone'); // [cite: 841]
        this.scene.physics.add.existing(hitZone); // [cite: 841]
        
        let hasHit = false; // [cite: 842]
        const targets = [(this.scene as any).enemies, (this.scene as any).breakables]; // [cite: 842]
        
        this.scene.physics.add.overlap(hitZone, targets, (hz, target: any) => { // [cite: 842]
            const yTol = target.isBreakable ? 140 : 60; // [cite: 842]
            if (Math.abs(this.y - target.y) <= yTol) { // [cite: 842]
                if (!hasHit) { // [cite: 842]
                    this.safeCall('playSFX', action.includes('punch') ? this.punchImpacts : this.kickImpacts); // [cite: 842]
                    hasHit = true; // [cite: 842]
                }
                const damage = (action.includes('2') ? 15 : 10) * this.damageMultiplier; // [cite: 842]
                const hitX = (this.x + target.x) / 2; // [cite: 842]
                this.safeCall('spawnHitEffect', hitX, target.y - 50); // [cite: 842]
                
                if (target.takeDamage) target.takeDamage(damage); // [cite: 842]
                if (hitZone.body) (hitZone.body as Phaser.Physics.Arcade.Body).enable = false; // [cite: 842]
            }
        });
        
        this.once('animationcomplete', () => { // [cite: 842]
            if (hitZone.active) hitZone.destroy(); // [cite: 842]
            if (this.queuedAction) { const next = this.queuedAction; this.queuedAction = null; this.executeAction(next); } // [cite: 843]
            else { this.isAttacking = false; } // [cite: 843]
        });
    }

    // =========================================================================
    // NEW: Hulk-Style Ground Slam (Replaces the 2.5D Grapple)
    // =========================================================================
    private executeGroundSlam() {
        this.isAttacking = true;
        this.setVelocity(0, 0);
        
        const animKey = this.scene.anims.exists(`${this.characterName}-special-attack`) 
            ? `${this.characterName}-special-attack` 
            : `${this.characterName}-punch-1`;
            
        this.play(animKey, true);
        
        let triggered = false;
        
        // Listen to the animation frames so we spawn the shockwave precisely when her fists hit the ground
        const onUpdate = (anim: Phaser.Animations.Animation, frame: Phaser.Animations.AnimationFrame) => {
            if (anim.key !== animKey) return;
            
            // The attached frames show the impact occurs around frame index 4 or 5
            if (frame.index >= 5 && !triggered) {
                triggered = true;
                
                // 1. Massive Camera Shake
                this.scene.cameras.main.shake(300, 0.02); // Stronger than Marko's for that "Tank" feel
                
                // 2. Audio Impact
                this.safeCall('playSFX', ['explosion_02', 'Break_1']);
                
                // 3. Visual Effects: Expanding Blue Energy Ring (To match the sprite sheet style)
                const ring = this.scene.add.circle(this.x, this.y, 20, 0x00ffff, 0.6);
                this.scene.physics.add.existing(ring);
                
                this.scene.tweens.add({
                    targets: ring,
                    radius: 200,
                    alpha: 0,
                    duration: 400,
                    ease: 'Quad.easeOut',
                    onComplete: () => ring.destroy()
                });
                
                // 4. Physical Hitbox & Knockback
                const slamZone = this.scene.add.circle(this.x, this.y, 180);
                this.scene.physics.add.existing(slamZone);
                
                const targets = [(this.scene as any).enemies, (this.scene as any).breakables];
                
                this.scene.physics.overlap(slamZone, targets, (sz, target: any) => {
                    const yTolTarget = target.isBreakable ? 160 : 80;
                    
                    if (Math.abs(this.y - target.y) <= yTolTarget) {
                        const pushDir = target.x > this.x ? 1 : -1;
                        
                        if (target.takeDamage) {
                            target.takeDamage(50 * this.damageMultiplier); // Massive AoE damage
                            
                            if (target.body && target.type !== 'obj_kiosk' && target.type !== 'obj_kontejner') {
                                target.setVelocityX(550 * pushDir); // Violent pushback
                                
                                // Force them to the ground if the enemy class supports it
                                if (target.takeKnockdown && !target.isDead) {
                                    target.takeKnockdown();
                                } else {
                                    target.setVelocityY(-150); // Slight pop-up for visual weight
                                }
                            }
                        }
                        this.safeCall('spawnHitEffect', target.x, target.y - 50);
                    }
                });
                
                // Destroy the physics zone instantly so it only hits once
                this.scene.time.delayedCall(100, () => { if (slamZone.active) slamZone.destroy(); });
            }
        };
        
        this.on('animationupdate', onUpdate);
        
        this.once('animationcomplete', () => {
            this.isAttacking = false;
            this.off('animationupdate', onUpdate);
        });
    }

    private executeIndustrialDrill() { // [cite: 845]
        this.isAttacking = true; // [cite: 845]
        
        const anim = this.scene.anims.exists(`${this.characterName}-finish-move`) ? `${this.characterName}-finish-move` : `${this.characterName}-run`; // [cite: 845]
        
        if (this.scene.anims.exists(anim)) this.play(anim, true); // [cite: 845]
        
        this.safeCall('triggerScreenGlitch', 600); // [cite: 845]
        
        const direction = this.flipX ? -1 : 1; // [cite: 845]
        this.setVelocityX(500 * direction); // [cite: 845]
        
        const drillZone = this.scene.add.zone(this.x, this.y, 100, 80); // [cite: 845]
        this.scene.physics.add.existing(drillZone); // [cite: 845]
        
        const targets = [(this.scene as any).enemies, (this.scene as any).breakables]; // [cite: 845]
        
        const drillUpdate = () => { // [cite: 845]
            if (!drillZone.active) return; // [cite: 845]
            drillZone.setPosition(this.x + (60 * direction), this.y - 40); // [cite: 845]
            
            this.scene.physics.overlap(drillZone, targets, (dz, target: any) => { // [cite: 845]
                const yTol = target.isBreakable ? 140 : 60; // [cite: 846]
                if (Math.abs(this.y - target.y) <= yTol) { // [cite: 846]
                    this.safeCall('spawnHitEffect', target.x, target.y - 50); // [cite: 846]
                    if (target.takeDamage) target.takeDamage(5); // [cite: 846]
                }
            });
        }; // [cite: 846]
        
        this.scene.events.on('update', drillUpdate); // [cite: 846]
        
        this.once('animationcomplete', () => { // [cite: 846]
            this.setVelocityX(0); // [cite: 846]
            if (drillZone.active) drillZone.destroy(); // [cite: 846]
            this.scene.events.off('update', drillUpdate); // [cite: 846]
            this.isAttacking = false; // [cite: 846]
        });
    }

    public takeDamage(amount: number) { // [cite: 846]
        this.health -= amount; this.queuedAction = null; // [cite: 846]
        this.safeCall('spawnHitEffect', this.x, this.y - 40); // [cite: 846]
        if (this.scene) (this.scene as any).lastPlayerHitTime = Date.now(); // [cite: 846]
        
        if (this.equippedWeapon) { // [cite: 847]
            this.weaponHitsTaken++; // [cite: 847]
            if (this.weaponHitsTaken >= 4) { // [cite: 847]
                this.dropAndFadeWeapon(); // [cite: 847]
            }
        }
        
        if (this.health <= 0) { // [cite: 847]
            this.safeCall('playSFX', this.agonies); // [cite: 847]
            this.die(); // [cite: 847]
        } else {
            this.safeCall('playSFX', this.grunts); // [cite: 847]
            const dmgAnim = `${this.characterName}-damage`; // [cite: 847]
            
            if (this.scene.anims.exists(dmgAnim)) { this.isAttacking = true; this.play(dmgAnim, true); this.once('animationcomplete', () => { this.isAttacking = false; }); } // [cite: 847]
            else { this.setTint(0xff0000); this.scene.time.delayedCall(200, () => this.clearTint()); } // [cite: 847]
        }
        this.safeCall('updateReactHUD'); // [cite: 847]
    }

    public takeKnockdown(amount: number = 15) { // [cite: 847]
        this.health -= amount; // [cite: 847]
        this.queuedAction = null; // [cite: 848]
        this.safeCall('spawnHitEffect', this.x, this.y - 40); // [cite: 848]
        if (this.scene) (this.scene as any).lastPlayerHitTime = Date.now(); // [cite: 848]
        
        if (this.equippedWeapon) { // [cite: 848]
            this.dropAndFadeWeapon(); // [cite: 848]
        }
        
        if (this.health <= 0) { // [cite: 848]
            this.safeCall('playSFX', this.agonies); // [cite: 848]
            this.die(); // [cite: 848]
        } else {
            this.safeCall('playSFX', this.grunts); // [cite: 848]
            const anim = `${this.characterName}-knockdown-get-up`; // [cite: 848]
            
            if (this.scene.anims.exists(anim)) { // [cite: 848]
                this.isAttacking = true; // [cite: 848]
                this.play(anim, true); // [cite: 848]
                this.once('animationcomplete', () => { this.isAttacking = false; }); // [cite: 848]
            } else {
                this.setTint(0xff0000); // [cite: 848]
                this.scene.time.delayedCall(200, () => this.clearTint()); // [cite: 848]
            }
        }
        this.safeCall('updateReactHUD'); // [cite: 849]
    }

    private die() { // [cite: 849]
        this.isDead = true; // [cite: 849]
        this.setVelocity(0, 0); // [cite: 849]
        const dieAnim = `${this.characterName}-dying`; // [cite: 849]
        
        if (this.scene.anims.exists(dieAnim)) { // [cite: 849]
            this.play(dieAnim, true); // [cite: 849]
        } else {
            this.setTint(0xff0000); // [cite: 849]
        }
        
        if (this.weaponSprite) this.weaponSprite.destroy(); // [cite: 849]
    }
}