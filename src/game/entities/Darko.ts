import Phaser from 'phaser'; // [cite: 657]
import { CHARACTER_STATS } from '../config/CharacterStats'; // [cite: 658]

export class Darko extends Phaser.Physics.Arcade.Sprite { // [cite: 658]

    public health: number = CHARACTER_STATS.darko_1993.maxHealth; // [cite: 659]
    public maxHealth: number = CHARACTER_STATS.darko_1993.maxHealth; // [cite: 660]
    public smfMeter: number = 0; // [cite: 660]
    public characterName: string = 'darko'; // [cite: 661]
    public damageMultiplier: number = CHARACTER_STATS.darko_1993.hitDamage / 12; // [cite: 661-662]
    
    public isAttacking: boolean = false; // [cite: 662]
    public isDead: boolean = false; // [cite: 663]
    public isJumping: boolean = false; // [cite: 663]
    
    public equippedWeapon: string | null = null; // [cite: 664]
    public weaponDurability: number = 0; // [cite: 664]
    public weaponHitsTaken: number = 0; // [cite: 665]
    private weaponSprite: Phaser.GameObjects.Sprite | null = null; // [cite: 665]
    
    private weaponOffsets: Record<string, { x: number, y: number, angle: number }> = { // [cite: 666]
        'idle': { x: 30, y: -110, angle: -15 }, // [cite: 666]
        'walk': { x: 35, y: -115, angle: -5 }, // [cite: 667]
        'run': { x: 45, y: -110, angle: 15 }, // [cite: 667]
        'jump': { x: 25, y: -120, angle: -30 }, // [cite: 668]
        'shoot': { x: 60, y: -105, angle: 0 } // [cite: 668]
    }; // [cite: 669]
    
    private currentVoice: any = null; // [cite: 670]
    private walkSpeed: number = CHARACTER_STATS.darko_1993.baseSpeed; // [cite: 670]
    private runSpeed: number = CHARACTER_STATS.darko_1993.runSpeed; // [cite: 671]
    private jumpVelocityX: number = 0; // [cite: 671]
    
    // REMOVED: jumpVisualHeight to prevent the origin manipulation loop
    
    private lastKey: string = ''; // [cite: 672]
    private lastKeyTime: number = 0; // [cite: 673]
    private isRunning: boolean = false; // [cite: 673]
    private queuedAction: string | null = null; // [cite: 674]
    
    private punchImpacts = ['punch_1', 'punch_2', 'punch_3', 'punch_4', 'punch_5', 'punch_6', 'punch_7', 'punch_8']; // [cite: 674]
    private kickImpacts = ['kick_1', 'kick_2', 'kick_3', 'kick_4']; // [cite: 675]
    private grunts = ['grunt_m_1', 'grunt_m_2', 'grunt_m_3', 'grunt_m_4']; // [cite: 675]
    private agonies = ['agony_m_1', 'agony_m_2', 'agony_m_3', 'agony_m_4']; // [cite: 676]
    private specialAudio = ['darko_special_1', 'darko_special_2', 'darko-special-smf']; // [cite: 676]

    constructor(scene: Phaser.Scene, x: number, y: number) { // [cite: 677]
        const texture = scene.textures.get('darko'); // [cite: 678]
        const allFrames = texture ? texture.getFrameNames() : []; // [cite: 678]
        const firstFrame = allFrames.find(f => f.includes('darko-idle')) || allFrames; // [cite: 679]
        
        super(scene, x, y, 'darko', firstFrame); // [cite: 679]
        
        scene.add.existing(this); // [cite: 680]
        scene.physics.add.existing(this); // [cite: 680]
        
        this.setOrigin(0.5, 1); // [cite: 681]
        this.setScale(1.7); // [cite: 681]
        
        if (this.body) { // [cite: 682]
            this.body.setSize(50, 30); // [cite: 682]
            this.body.setOffset(this.width / 2 - 25, this.height - 30); // [cite: 683]
            (this.body as Phaser.Physics.Arcade.Body).setAllowRotation(false); // [cite: 683]
        } // [cite: 684]
        
        this.createAnimations(); // [cite: 684]
    }

    private safeCall(methodName: string, ...args: any[]) { // [cite: 685]
        if (this.scene && typeof (this.scene as any)[methodName] === 'function') { // [cite: 685]
            return (this.scene as any)[methodName](...args); // [cite: 686]
        }
        return null; // [cite: 686]
    }

    private createAnimations() { // [cite: 687]
        const anims = this.scene.anims; // [cite: 687]
        if (anims.exists(`${this.characterName}-idle`)) return; // [cite: 688]
        
        const texture = this.scene.textures.get(this.characterName); // [cite: 688]
        if (!texture || texture.key === '__MISSING') return; // [cite: 689]
        
        const allFrames = texture.getFrameNames(); // [cite: 689]
        const animTypes = [ // [cite: 690]
            'idle', 'walk', 'run', 'jump', 'punch-1', 'punch-2', 'kick-1', 'kick-2', // [cite: 690]
            'melee', 'jump-punch', 'jump-kick', 'special-attack', 'finish-move', // [cite: 691]
            'throw', 'damage', 'knockdown-get-up', 'dying', 'pick-up', // [cite: 691]
            'shoot', 'shoot-recoil', 'shoot-up', 'shoot-with-rifle', 'walk-rifle' // [cite: 692]
        ]; // [cite: 693]

        animTypes.forEach(animType => { // [cite: 693]
            const animKey = `${this.characterName}-${animType}`; // [cite: 694]
            if (anims.exists(animKey)) return; // [cite: 694]
            
            const searchStr = `${animKey}/frame_`; // [cite: 695]
            const matchingFrames = allFrames.filter(f => f.includes(searchStr)).sort(); // [cite: 695]
            
            if (matchingFrames.length > 0) { // [cite: 696]
                let fps = 15; // [cite: 696]
                if (animType === 'idle') fps = 6; // [cite: 697]
                else if (animType === 'walk' || animType === 'walk-rifle') fps = 12; // [cite: 697]
                else if (animType === 'run') fps = 18; // [cite: 698]
                else if (animType === 'jump') fps = 8; // [cite: 698]
                else if (animType === 'melee') fps = 18; // [cite: 699]
                else if (animType === 'kick-1' || animType === 'kick-2') fps = 22; // [cite: 699-700]
                
                const frameConfig = matchingFrames.map(f => { // [cite: 700]
                    return { key: this.characterName, frame: f }; // [cite: 701]
                }); // [cite: 701]
                
                if (animType === 'shoot-with-rifle' && frameConfig.length === 1) { // [cite: 702-703]
                    frameConfig.push(frameConfig, frameConfig, frameConfig); // [cite: 704]
                }
                
                anims.create({ // [cite: 704]
                    key: animKey, // [cite: 705]
                    frames: frameConfig, // [cite: 705]
                    frameRate: fps, // [cite: 706]
                    repeat: (animType === 'idle' || animType === 'walk' || animType === 'run' || animType === 'walk-rifle') ? -1 : 0 // [cite: 706-707]
                }); // [cite: 707]
            }
        }); // [cite: 708]
    }

    public equipWeapon(weaponKey: string) { // [cite: 708]
        if (this.weaponSprite) this.weaponSprite.destroy(); // [cite: 709]
        this.equippedWeapon = weaponKey; // [cite: 709]
        this.weaponHitsTaken = 0; // [cite: 710]
        
        if (weaponKey === 'M70-FINAL rev') { // [cite: 711]
            this.weaponDurability = 5; // [cite: 712]
            this.weaponSprite = null; // [cite: 712]
        } else { // [cite: 713]
            this.weaponDurability = 5; // [cite: 713]
            this.weaponSprite = this.scene.add.sprite(this.x, this.y, weaponKey); // [cite: 714]
            (this.weaponSprite as any).isWeaponSprite = true; // [cite: 714]
            this.weaponSprite.setScale(1.3); // [cite: 715]
            this.weaponSprite.setOrigin(0.5, 0.8); // [cite: 715]
        }
    }

    private dropAndFadeWeapon() { // [cite: 716]
        if (!this.equippedWeapon) return; // [cite: 716]
        
        const drop = this.scene.add.sprite(this.x, this.y - 150, this.equippedWeapon); // [cite: 717]
        if (this.equippedWeapon === 'M70-FINAL rev') drop.setScale(1.0); // [cite: 717]
        else drop.setScale(1.3); // [cite: 718]
        
        drop.setFlipX(this.flipX); // [cite: 718]
        
        this.scene.tweens.add({ // [cite: 719]
            targets: drop, // [cite: 720]
            x: this.x + (this.flipX ? -80 : 80), // [cite: 720]
            duration: 600, // [cite: 721]
            ease: 'Linear' // [cite: 721]
        }); // [cite: 721]
        
        this.scene.tweens.add({ // [cite: 722]
            targets: drop, // [cite: 722]
            y: this.y, // [cite: 723]
            angle: 0, // [cite: 723]
            duration: 600, // [cite: 724]
            ease: 'Bounce.easeOut' // [cite: 724]
        }); // [cite: 725]
        
        this.scene.tweens.add({ // [cite: 725]
            targets: drop, // [cite: 726]
            alpha: 0, // [cite: 726]
            duration: 150, // [cite: 727]
            delay: 1500, // [cite: 727]
            yoyo: true, // [cite: 729]
            repeat: 4, // [cite: 729]
            onComplete: () => { // [cite: 730]
                this.scene.tweens.add({ // [cite: 730]
                    targets: drop, // [cite: 731]
                    alpha: 0, // [cite: 732]
                    duration: 300, // [cite: 732]
                    onComplete: () => drop.destroy() // [cite: 733]
                }); // [cite: 731-733]
            }
        }); // [cite: 730-733]
        
        this.equippedWeapon = null; // [cite: 733]
        if (this.weaponSprite) { // [cite: 734]
            this.weaponSprite.destroy(); // [cite: 734]
            this.weaponSprite = null; // [cite: 735]
        } // [cite: 734-735]
    }

    private positionWeaponSprite() { // [cite: 735]
        if (!this.weaponSprite || !this.equippedWeapon) return; // [cite: 736]
        
        this.weaponSprite.visible = true; // [cite: 737]
        
        const currentAnimKey = this.anims.currentAnim?.key.replace(`${this.characterName}-`, '') || 'idle'; // [cite: 738]
        const currentFrameName = this.frame.name; // [cite: 738]
        const dirX = this.flipX ? -1 : 1; // [cite: 739]
        const jumpVisualOffset = this.height - this.displayOriginY; // [cite: 739]
        
        let targetX = this.x; // [cite: 740]
        let targetY = this.y + jumpVisualOffset; // [cite: 740]
        let targetAngle = 0; // [cite: 741]
        
        if (['special-attack', 'finish-move', 'jump-punch', 'jump-kick', 'knockdown-get-up'].includes(currentAnimKey) || currentFrameName.includes('pick-up') || this.equippedWeapon === 'M70-FINAL rev') { // [cite: 741-742]
            this.weaponSprite.visible = false; // [cite: 742]
            return; // [cite: 743]
        } // [cite: 743]
        
        if (currentAnimKey === 'melee') { // [cite: 743]
            if (currentFrameName.includes('018') || currentFrameName.includes('019') || currentFrameName.includes('020')) { // [cite: 744]
                targetX += (-30 * dirX); targetY -= 120; targetAngle = -30 * dirX; // [cite: 745-746]
            } else if (currentFrameName.includes('004') || currentFrameName.includes('005') || currentFrameName.includes('006')) { // [cite: 747]
                targetX += (-10 * dirX); targetY -= 170; targetAngle = 30 * dirX; // [cite: 747-748]
            } else if (currentFrameName.includes('021') || currentFrameName.includes('022') || currentFrameName.includes('023')) { // [cite: 749]
                targetX += (85 * dirX); targetY -= 105; targetAngle = 85 * dirX; // [cite: 749-750]
            } else if (currentFrameName.includes('028') || currentFrameName.includes('029') || currentFrameName.includes('030')) { // [cite: 751]
                targetX += (65 * dirX); targetY -= 75; targetAngle = 135 * dirX; // [cite: 751-752]
            } else { // [cite: 753]
                targetX += (40 * dirX); targetY -= 135; targetAngle = 55 * dirX; // [cite: 753-754]
            } // [cite: 754]
        } else if (currentAnimKey === 'throw') { // [cite: 755]
            if (currentFrameName.includes('000') || currentFrameName.includes('001') || currentFrameName.includes('002') || currentFrameName.includes('003') || currentFrameName.includes('004')) { // [cite: 756]
                targetX += (-10 * dirX); targetY -= 170; targetAngle = -30 * dirX; // [cite: 757-758]
            } else if (currentFrameName.includes('005') || currentFrameName.includes('006') || currentFrameName.includes('007') || currentFrameName.includes('008') || currentFrameName.includes('009') || currentFrameName.includes('010') || currentFrameName.includes('011') || currentFrameName.includes('012') || currentFrameName.includes('013') || currentFrameName.includes('014') || currentFrameName.includes('015')) { // [cite: 758-761]
                targetX += (-30 * dirX); targetY -= 180; targetAngle = -60 * dirX; // [cite: 761-762]
            } else if (currentFrameName.includes('016') || currentFrameName.includes('017') || currentFrameName.includes('018') || currentFrameName.includes('019')) { // [cite: 763]
                targetX += (20 * dirX); targetY -= 170; targetAngle = 45 * dirX; // [cite: 764-765]
            } else { // [cite: 765]
                targetX += (70 * dirX); targetY -= 150; targetAngle = 90 * dirX; // [cite: 766-767]
            } // [cite: 767]
        } else { // [cite: 768]
            const offset = this.weaponOffsets[currentAnimKey] || this.weaponOffsets['idle']; // [cite: 768]
            targetX += (offset.x * dirX); // [cite: 769]
            targetY += offset.y; // [cite: 769]
            targetAngle = offset.angle * dirX; // [cite: 770]
        } // [cite: 770]
        
        this.weaponSprite.setPosition(targetX, targetY); // [cite: 770]
        this.weaponSprite.setAngle(targetAngle); // [cite: 771]
        this.weaponSprite.setFlipX(this.flipX); // [cite: 771]
        this.weaponSprite.setDepth(this.depth + 1); // [cite: 772]
        this.weaponSprite.visible = true; // [cite: 772]
    }

    private throwWeapon() { // [cite: 773]
        if (!this.equippedWeapon) return; // [cite: 773]
        
        const dirX = this.flipX ? -1 : 1; // [cite: 774]
        this.safeCall('spawnProjectile', this.y, this.x + (20 * dirX), this.y - 120, this.equippedWeapon, dirX, 50, true); // [cite: 774]
        
        this.equippedWeapon = null; // [cite: 775]
        if (this.weaponSprite) { // [cite: 776]
            this.weaponSprite.destroy(); // [cite: 776]
            this.weaponSprite = null; // [cite: 777]
        } // [cite: 776-777]
    }

    private executeWeaponAttack() { // [cite: 777]
        this.isAttacking = true; // [cite: 778]
        this.setVelocity(0, 0); // [cite: 778]
        
        if (this.equippedWeapon === 'M70-FINAL rev') { // [cite: 779]
            if (this.scene.anims.exists(`${this.characterName}-shoot-with-rifle`)) { // [cite: 779]
                this.play(`${this.characterName}-shoot-with-rifle`, true); // [cite: 780]
            } else if (this.scene.anims.exists(`${this.characterName}-shoot`)) { // [cite: 780]
                this.play(`${this.characterName}-shoot`, true); // [cite: 781]
            }
            
            const dirX = this.flipX ? -1 : 1; // [cite: 781]
            this.safeCall('playSFX', 'gun-shot-m70', 1.0); // [cite: 782]
            
            const spawnX = this.x + (150 * dirX); // [cite: 783]
            const flashX = this.x + (170 * dirX); // [cite: 784]
            const spawnY = this.y - 230; // [cite: 784]
            
            this.safeCall('spawnProjectile', this.y, spawnX, spawnY, 'bullet', dirX, 60, false); // [cite: 785]
            
            const flash = this.scene.add.sprite(flashX, spawnY, 'muzzle-flash-m70'); // [cite: 785]
            flash.setDepth(9999); // [cite: 786]
            flash.setFlipX(this.flipX); // [cite: 786]
            flash.setScale(1.2); // [cite: 787]
            flash.setBlendMode(Phaser.BlendModes.ADD); // [cite: 787]
            
            this.scene.tweens.add({ targets: flash, alpha: 0, duration: 100, onComplete: () => flash.destroy() }); // [cite: 788]
            this.scene.cameras.main.shake(100, 0.01); // [cite: 788]
            
            this.weaponDurability--; // [cite: 789]
            if (this.weaponDurability <= 0) { // [cite: 789]
                this.scene.time.delayedCall(150, () => { // [cite: 790]
                    this.dropAndFadeWeapon(); // [cite: 790]
                    this.scene.time.delayedCall(300, () => { this.isAttacking = false; }); // [cite: 791]
                });
            } else { // [cite: 791]
                this.scene.time.delayedCall(300, () => { this.isAttacking = false; }); // [cite: 792]
            }
        } else { // [cite: 792]
            this.weaponDurability--; // [cite: 792]
            if (this.weaponDurability <= 0) { // [cite: 792]
                this.scene.time.delayedCall(100, () => this.dropAndFadeWeapon()); // [cite: 792]
                this.play(`${this.characterName}-punch-2`, true); // [cite: 792]
                this.once('animationcomplete', () => { this.isAttacking = false; }); // [cite: 792]
                return; // [cite: 792]
            } // [cite: 792]
            
            const animToPlay = this.scene.anims.exists(`${this.characterName}-melee`) ? `${this.characterName}-melee` : `${this.characterName}-punch-2`; // [cite: 792]
            this.play(animToPlay, true); // [cite: 792]
            
            const hitZone = this.scene.add.zone(this.x + (this.flipX ? -80 : 80), this.y - 60, 160, 100); // [cite: 792]
            this.scene.physics.add.existing(hitZone); // [cite: 792]
            
            let hasHit = false; // [cite: 793]
            const targets = [(this.scene as any).enemies, (this.scene as any).breakables]; // [cite: 793]
            
            this.scene.physics.add.overlap(hitZone, targets, (hz, target: any) => { // [cite: 793]
                const yTol = target.isBreakable ? 140 : 60; // [cite: 793]
                if (Math.abs(this.y - target.y) <= yTol) { // [cite: 793]
                    if (!hasHit) { // [cite: 793]
                        this.safeCall('playSFX', ['punch_4', 'punch_5']); // [cite: 793]
                        hasHit = true; // [cite: 793]
                    } // [cite: 793]
                    const hitX = (this.x + target.x) / 2; // [cite: 793]
                    this.safeCall('spawnBlood', hitX, target.y - 50); // [cite: 793]
                    if (target.takeDamage) target.takeDamage(25 * this.damageMultiplier); // [cite: 793]
                    if (hitZone.body) (hitZone.body as Phaser.Physics.Arcade.Body).enable = false; // [cite: 793]
                } // [cite: 793]
            }); // [cite: 793]
            
            this.once('animationcomplete', () => { // [cite: 793]
                if (hitZone.active) hitZone.destroy(); // [cite: 793]
                this.isAttacking = false; // [cite: 793]
            }); // [cite: 793-794]
        }
    }

    private playVoice(marker: string | string[]) { // [cite: 794]
        if (this.currentVoice && this.currentVoice.isPlaying) this.currentVoice.stop(); // [cite: 794]
        this.currentVoice = this.safeCall('playSFX', marker); // [cite: 794]
    }

    public playPickupAnim() { // [cite: 794]
        if (this.isDead || this.isJumping || this.isAttacking) return; // [cite: 794]
        this.isAttacking = true; // [cite: 794]
        this.setVelocity(0, 0); // [cite: 794]
        this.anims.stop(); // [cite: 794]
        this.setFrame('darko-pick-up/frame_002.png'); // [cite: 794]
        this.setTintFill(0x39ff14); // [cite: 794]
        this.scene.time.delayedCall(100, () => this.clearTint()); // [cite: 794]
        this.scene.time.delayedCall(300, () => { // [cite: 795]
            this.isAttacking = false; // [cite: 795]
        }); // [cite: 795]
    }

    public update(input: any) { // [cite: 795]
        if (this.isDead) return; // [cite: 795]

        this.setAngle(0); // [cite: 795]

        // ALWAYS strictly lock scale to prevent ballooning
        this.setScale(1.7); // [cite: 795]

        // Fix: Removed the dynamic origin mapping logic to fix visual jitter.
        this.positionWeaponSprite(); // [cite: 796]

        // --- JUMP LOGIC ---
        if (input.space && !this.isJumping && !this.isAttacking) { // [cite: 796]
            this.isJumping = true; // [cite: 796]
            
            if (input.left) this.jumpVelocityX = -this.runSpeed * 1.2; // [cite: 796]
            else if (input.right) this.jumpVelocityX = this.runSpeed * 1.2; // [cite: 796]
            else this.jumpVelocityX = 0; // [cite: 796]

            if (this.scene.anims.exists(`${this.characterName}-jump`)) { // [cite: 796]
                this.play(`${this.characterName}-jump`, true); // [cite: 796]
            } // [cite: 796]

            // Tween the native displayOriginY to safely render leaps
            const startOriginY = this.displayOriginY; 

            this.scene.tweens.add({ // [cite: 797]
                targets: this, // [cite: 797]
                displayOriginY: startOriginY + 220, 
                duration: 400, // [cite: 797]
                yoyo: true, // [cite: 797]
                ease: 'Quad.easeOut', // [cite: 797]
                onComplete: () => { // [cite: 797]
                    this.isJumping = false; // [cite: 797]
                    this.displayOriginY = startOriginY; // Reset to safe baseline
                    
                    if (!this.isAttacking && this.scene.anims.exists(`${this.characterName}-idle`)) { // [cite: 797]
                        this.play(`${this.characterName}-idle`, true); // [cite: 797]
                    } // [cite: 797]
                } // [cite: 797]
            }); // [cite: 797]
        } // [cite: 797]

        const now = this.scene.time.now; // [cite: 797]
        
        if (input.left || input.right) { // [cite: 797]
            const dir = input.left ? 'left' : 'right'; // [cite: 797]
            if (this.lastKey !== dir) {  // [cite: 798]
                if (now - this.lastKeyTime < 250) this.isRunning = true;  // [cite: 798]
                this.lastKey = dir;  // [cite: 798]
                this.lastKeyTime = now;  // [cite: 798]
            } // [cite: 798]
        } else {  // [cite: 798]
            this.isRunning = false;  // [cite: 798]
            this.lastKey = '';  // [cite: 798]
        } // [cite: 798]

        let requestedAction: string | null = null; // [cite: 798]
        
        if (input.special) requestedAction = 'special'; // [cite: 798]
        else if (input.finisher) requestedAction = 'finisher'; // [cite: 798]
        else if (input.p1) requestedAction = 'punch-1'; // [cite: 798]
        else if (input.p2) requestedAction = 'punch-2'; // [cite: 798]
        else if (input.k1) requestedAction = 'kick-1'; // [cite: 798]
        else if (input.k2) requestedAction = 'kick-2'; // [cite: 798]

        if (requestedAction) { // [cite: 798]
            if (this.isJumping && !this.isAttacking) { // [cite: 798]
                if (requestedAction.includes('punch') || requestedAction.includes('kick')) { // [cite: 798]
                    this.executeJumpAttack(requestedAction); // [cite: 798]
                } // [cite: 798]
            } else if (!this.isJumping) { // [cite: 798]
                if (this.isAttacking && (requestedAction === 'special' || requestedAction === 'finisher')) { // [cite: 798]
                    this.isAttacking = false; // [cite: 799]
                    const oldZone = this.scene.children.getByName('basicAttackZone'); // [cite: 799]
                    if (oldZone) oldZone.destroy(); // [cite: 799]
                } // [cite: 799]
                
                if (!this.isAttacking) { // [cite: 799]
                    if (this.equippedWeapon && (requestedAction === 'punch-1' || requestedAction === 'punch-2')) { // [cite: 799]
                        this.executeWeaponAttack(); // [cite: 799]
                    } else { // [cite: 799]
                        this.executeAction(requestedAction); // [cite: 799]
                    } // [cite: 799]
                } else { // [cite: 799]
                    this.queuedAction = requestedAction; // [cite: 799]
                } // [cite: 799]
            } // [cite: 799]
            return; // [cite: 799]
        } // [cite: 799]

        if (!this.isAttacking) { // [cite: 799]
            let vx = 0; let vy = 0; // [cite: 799]
            
            if (this.isJumping) { // [cite: 799]
                vx = this.jumpVelocityX; // [cite: 799]
            } else { // [cite: 799]
                const speed = this.isRunning ? this.runSpeed : this.walkSpeed; // [cite: 800]
                vx = input.left ? -speed : (input.right ? speed : 0); // [cite: 800]
                vy = input.up ? -speed * 0.6 : (input.down ? speed * 0.6 : 0); // [cite: 800]
            } // [cite: 800]
            
            this.setVelocity(vx, vy); // [cite: 800]
            if (vx !== 0) this.setFlipX(vx < 0); // [cite: 800]
            
            if (!this.isJumping) { // [cite: 800]
                if (vx !== 0 || vy !== 0) { // [cite: 800]
                    if (this.isRunning) { // [cite: 800]
                        this.play(`${this.characterName}-run`, true); // [cite: 800]
                    } else { // [cite: 800]
                        if (this.equippedWeapon === 'M70-FINAL rev' && this.scene.anims.exists(`${this.characterName}-walk-rifle`)) { // [cite: 800]
                            this.play(`${this.characterName}-walk-rifle`, true); // [cite: 800]
                        } else if (this.equippedWeapon === 'M70-FINAL rev' && this.scene.anims.exists(`${this.characterName}-shoot-with-rifle`)) { // [cite: 800]
                            this.play(`${this.characterName}-shoot-with-rifle`, true); // [cite: 800]
                        } else { // [cite: 801]
                            this.play(`${this.characterName}-walk`, true); // [cite: 801]
                        } // [cite: 801]
                    } // [cite: 801]
                } else { // [cite: 801]
                    if (this.equippedWeapon === 'M70-FINAL rev' && this.scene.anims.exists(`${this.characterName}-shoot-with-rifle`)) { // [cite: 801]
                        this.play(`${this.characterName}-shoot-with-rifle`, true); // [cite: 801]
                    } else { // [cite: 801]
                        this.play(`${this.characterName}-idle`, true); // [cite: 801]
                    } // [cite: 801]
                } // [cite: 801]
            } // [cite: 801]
        } else { // [cite: 801]
            if (this.isJumping) { // [cite: 801]
                this.setVelocity(this.jumpVelocityX, 0); // [cite: 801]
            } // [cite: 801]
        } // [cite: 801]
    }

    private executeJumpAttack(action: string) { // [cite: 801]
        this.isAttacking = true; // [cite: 801]
        const type = action.includes('punch') ? 'jump-punch' : 'jump-kick'; // [cite: 801]
        const animToPlay = `${this.characterName}-${type}`; // [cite: 801]
        
        if (this.scene.anims.exists(animToPlay)) this.play(animToPlay, true); // [cite: 802]
        else if (this.scene.anims.exists(`${this.characterName}-kick-1`)) this.play(`${this.characterName}-kick-1`, true); // [cite: 802]
        
        const hitZone = this.scene.add.zone(this.x + (this.flipX ? -60 : 60), this.y - 100, 140, 90); // [cite: 802]
        this.scene.physics.add.existing(hitZone); // [cite: 802]
        
        let hasHit = false; // [cite: 802]
        const targets = [(this.scene as any).enemies, (this.scene as any).breakables]; // [cite: 802]
        
        this.scene.physics.add.overlap(hitZone, targets, (hz, target: any) => { // [cite: 802]
            const yTol = target.isBreakable ? 140 : 60; // [cite: 802]
            if (Math.abs(this.y - target.y) <= yTol) { // [cite: 802]
                if (!hasHit) { // [cite: 802]
                    this.safeCall('playSFX', action.includes('punch') ? this.punchImpacts : this.kickImpacts); // [cite: 802]
                    hasHit = true; // [cite: 802]
                } // [cite: 802]
                const damage = 15 * this.damageMultiplier; // [cite: 802]
                const hitX = (this.x + target.x) / 2; // [cite: 802]
                this.safeCall('spawnHitEffect', hitX, target.y - 80); // [cite: 802-803]
                
                if (target.takeDamage) target.takeDamage(damage); // [cite: 803]
                if (hitZone.body) (hitZone.body as Phaser.Physics.Arcade.Body).enable = false; // [cite: 803]
            } // [cite: 803]
        }); // [cite: 803]
        
        this.once('animationcomplete', () => { // [cite: 803]
            if (hitZone.active) hitZone.destroy(); // [cite: 803]
            this.isAttacking = false; // [cite: 803]
        }); // [cite: 803]
    }

    private executeAction(action: string) { // [cite: 803]
        if (action === 'special') { this.executeDarkoSpecial(); return; } // [cite: 803]
        if (action === 'finisher') { this.executeDarkoFinisher(); return; } // [cite: 803]
        
        this.isAttacking = true; this.setVelocity(0, 0); // [cite: 803]
        const animToPlay = `${this.characterName}-${action}`; // [cite: 803]
        
        if (this.scene.anims.exists(animToPlay)) this.play(animToPlay, true); // [cite: 803]
        
        let zoneWidth = 140; // [cite: 803]
        let offsetX = 80; // [cite: 803]
        
        if (action === 'kick-2') { // [cite: 803]
            zoneWidth = 200; // [cite: 803]
            offsetX = 110; // [cite: 804]
        } // [cite: 804]
        
        const hitZone = this.scene.add.zone(this.x + (this.flipX ? -offsetX : offsetX), this.y - 40, zoneWidth, 80); // [cite: 804]
        hitZone.setName('basicAttackZone'); // [cite: 804]
        this.scene.physics.add.existing(hitZone); // [cite: 804]
        
        let hasHit = false; // [cite: 804]
        const targets = [(this.scene as any).enemies, (this.scene as any).breakables]; // [cite: 804]
        
        this.scene.physics.add.overlap(hitZone, targets, (hz, target: any) => { // [cite: 804]
            const yTol = target.isBreakable ? 140 : 60; // [cite: 804]
            if (Math.abs(this.y - target.y) <= yTol) { // [cite: 804]
                if (!hasHit) { // [cite: 804]
                    this.safeCall('playSFX', action.includes('punch') ? this.punchImpacts : this.kickImpacts); // [cite: 804]
                    hasHit = true; // [cite: 804]
                } // [cite: 804]
                const damage = (action.includes('2') ? 15 : 10) * this.damageMultiplier; // [cite: 804]
                const hitX = (this.x + target.x) / 2; // [cite: 804]
                this.safeCall('spawnHitEffect', hitX, target.y - 50); // [cite: 804]
                
                if (target.takeDamage) target.takeDamage(damage); // [cite: 804-805]
                if (hitZone.body) (hitZone.body as Phaser.Physics.Arcade.Body).enable = false; // [cite: 805]
            } // [cite: 805]
        }); // [cite: 805]
        
        this.once('animationcomplete', () => { // [cite: 805]
            if (hitZone.active) hitZone.destroy(); // [cite: 805]
            if (this.queuedAction) { const next = this.queuedAction; this.queuedAction = null; this.executeAction(next); } // [cite: 805]
            else { this.isAttacking = false; } // [cite: 805]
        }); // [cite: 805]
    }

    private executeDarkoSpecial() { // [cite: 805]
        this.isAttacking = true; // [cite: 805]
        this.setVelocity(0, 0); // [cite: 805]
        const anim = this.scene.anims.exists(`${this.characterName}-special-attack`) ? `${this.characterName}-special-attack` : `${this.characterName}-punch-1`; // [cite: 805]
        
        if (this.scene.anims.exists(anim)) this.play(anim, true); // [cite: 805]
        
        this.scene.time.delayedCall(200, () => { // [cite: 805]
            this.safeCall('playSFX', this.specialAudio); // [cite: 805]
            this.safeCall('triggerScreenGlitch', 400); // [cite: 805]
            this.scene.cameras.main.shake(300, 0.015); // [cite: 806]
            
            const spinZone = this.scene.add.circle(this.x, this.y - 40, 180); // [cite: 806]
            this.scene.physics.add.existing(spinZone); // [cite: 806]
            const targets = [(this.scene as any).enemies, (this.scene as any).breakables]; // [cite: 806]
            
            this.scene.physics.add.overlap(spinZone, targets, (sz, target: any) => { // [cite: 806]
                const yTol = target.isBreakable ? 160 : 60; // [cite: 806]
                if (Math.abs(this.y - target.y) <= yTol) { // [cite: 806]
                    const pushDir = target.x > this.x ? 1 : -1; // [cite: 806]
                    if (target.takeDamage) { // [cite: 806]
                        target.takeDamage(40 * this.damageMultiplier); // [cite: 806]
                        if (target.body && target.type !== 'obj_kiosk' && target.type !== 'obj_kontejner') { // [cite: 806]
                            target.setVelocityX(400 * pushDir); // [cite: 806]
                        } // [cite: 806]
                    } // [cite: 806]
                    this.safeCall('spawnHitEffect', target.x, target.y - 50); // [cite: 806]
                } // [cite: 806]
            }); // [cite: 806]
            
            this.scene.time.delayedCall(200, () => { if (spinZone.active) spinZone.destroy(); }); // [cite: 806-807]
        }); // [cite: 807]
        
        this.once('animationcomplete', () => { this.isAttacking = false; }); // [cite: 807]
    }

    private executeDarkoFinisher() { // [cite: 807]
        this.isAttacking = true; // [cite: 807]
        this.setVelocity(0, 0); // [cite: 807]
        const anim = this.scene.anims.exists(`${this.characterName}-finish-move`) ? `${this.characterName}-finish-move` : `${this.characterName}-punch-1`; // [cite: 807]
        
        if (this.scene.anims.exists(anim)) this.play(anim, true); // [cite: 807]
        
        this.scene.time.delayedCall(300, () => { // [cite: 807]
            this.safeCall('playSFX', ['explosion_01', 'explosion_02'], 1.0); // [cite: 807]
            this.safeCall('triggerScreenGlitch', 800); // [cite: 807]
            this.scene.cameras.main.shake(500, 0.03); // [cite: 807]
            
            const hitZone = this.scene.add.zone(this.x + (this.flipX ? -150 : 150), this.y - 40, 260, 120); // [cite: 807]
            this.scene.physics.add.existing(hitZone); // [cite: 807]
            const targets = [(this.scene as any).enemies, (this.scene as any).breakables]; // [cite: 807]
            
            this.scene.physics.add.overlap(hitZone, targets, (hz, target: any) => { // [cite: 807]
                const yTol = target.isBreakable ? 140 : 60; // [cite: 808]
                if (Math.abs(this.y - target.y) <= yTol) { // [cite: 808]
                    if (target.takeDamage) target.takeDamage(80 * this.damageMultiplier); // [cite: 808]
                    this.safeCall('spawnHitEffect', target.x, target.y - 50); // [cite: 808]
                    if (hitZone.body) (hitZone.body as Phaser.Physics.Arcade.Body).enable = false; // [cite: 808]
                } // [cite: 808]
            }); // [cite: 808]
            
            this.scene.time.delayedCall(100, () => { if (hitZone.active) hitZone.destroy(); }); // [cite: 808]
        }); // [cite: 808]
        
        this.once('animationcomplete', () => { this.isAttacking = false; }); // [cite: 808]
    }

    public takeDamage(amount: number) { // [cite: 808]
        this.health -= amount; this.queuedAction = null; // [cite: 808]
        this.safeCall('spawnHitEffect', this.x, this.y - 40); // [cite: 808]
        if (this.scene) (this.scene as any).lastPlayerHitTime = Date.now(); // [cite: 808]
        
        if (this.equippedWeapon) { // [cite: 808]
            this.weaponHitsTaken++; // [cite: 809]
            if (this.weaponHitsTaken >= 4) { // [cite: 809]
                this.dropAndFadeWeapon(); // [cite: 809]
            } // [cite: 809]
        } // [cite: 809]
        
        if (this.health <= 0) { // [cite: 809]
            this.safeCall('playSFX', this.agonies); // [cite: 809]
            this.die(); // [cite: 809]
        } else { // [cite: 809]
            this.safeCall('playSFX', this.grunts); // [cite: 809]
            const dmgAnim = `${this.characterName}-damage`; // [cite: 809]
            
            if (this.scene.anims.exists(dmgAnim)) { this.isAttacking = true; this.play(dmgAnim, true); this.once('animationcomplete', () => { this.isAttacking = false; }); } // [cite: 809]
            else { this.setTint(0xff0000); this.scene.time.delayedCall(200, () => this.clearTint()); } // [cite: 809]
        } // [cite: 809]
        this.safeCall('updateReactHUD'); // [cite: 809]
    }

    public takeKnockdown(amount: number = 15) { // [cite: 809]
        this.health -= amount; // [cite: 809]
        this.queuedAction = null; // [cite: 810]
        this.safeCall('spawnHitEffect', this.x, this.y - 40); // [cite: 810]
        if (this.scene) (this.scene as any).lastPlayerHitTime = Date.now(); // [cite: 810]
        
        if (this.equippedWeapon) { // [cite: 810]
            this.dropAndFadeWeapon(); // [cite: 810]
        } // [cite: 810]
        
        if (this.health <= 0) { // [cite: 810]
            this.safeCall('playSFX', this.agonies); // [cite: 810]
            this.die(); // [cite: 810]
        } else { // [cite: 810]
            this.safeCall('playSFX', this.grunts); // [cite: 810]
            const anim = `${this.characterName}-knockdown-get-up`; // [cite: 810]
            
            if (this.scene.anims.exists(anim)) { // [cite: 810]
                this.isAttacking = true; // [cite: 810]
                this.play(anim, true); // [cite: 810]
                this.once('animationcomplete', () => { this.isAttacking = false; }); // [cite: 810]
            } else { // [cite: 810]
                this.setTint(0xff0000); // [cite: 810]
                this.scene.time.delayedCall(200, () => this.clearTint()); // [cite: 811]
            } // [cite: 811]
        } // [cite: 811]
        this.safeCall('updateReactHUD'); // [cite: 811]
    }

    private die() { // [cite: 811]
        this.isDead = true; // [cite: 811]
        this.setVelocity(0, 0); // [cite: 811]
        const dieAnim = `${this.characterName}-dying`; // [cite: 811]
        
        if (this.scene.anims.exists(dieAnim)) { // [cite: 811]
            this.play(dieAnim, true); // [cite: 811]
        } else { // [cite: 811]
            this.setTint(0xff0000); // [cite: 811]
        } // [cite: 811]
        
        if (this.weaponSprite) this.weaponSprite.destroy(); // [cite: 811]
    }
}