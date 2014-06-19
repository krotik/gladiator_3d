/*jslint nomen: true, vars: true */
/*jshint scripturl: true, -W079 */
/*global yad: true, window: true, alert: true, jQuery: true, $: true*/

// This script is part of STFP
// Copyright (c) 2013 Matthias Ladkau

if (stfp === undefined) {
    var stfp = {};
}

// Mixin classes
// ==============

// Mixin class for animated sprites
//
// Requires: this._state
//
stfp.AnimatedSprite = ge.Class.create({


    // Options:
    // speed     - Animation speed
    // singlerun - Only run the animation once and stop at the last frame
    // oscillate - Oscillate the animation instead of looping
    // callback  - Function to call after animation has finished (only called if singlerun is true)
    runAnimation : function (startOffset, endOffset, options, callback) {
        "use strict";

        this._animationLoopStart       = true;
        this._animationDirection       = 1;
        this._animationLoopStartOffset = startOffset;
        this._animationLoopEndOffset   = endOffset;
        this._animationOptions         = options;
        this._callback                 = callback;

        if (this._animationLoop === undefined) {

            this._animationLoop = ge.bind(function (state) {

                if (this._animationLoopStart === true) {

                    this._state.spriteOffsetX = this._animationLoopStartOffset;
                    this._animationLoopStart  = false;

                } else {
                    if (this._animationDirection === 1) {
                        if (this._state.spriteOffsetX >= this._animationLoopEndOffset){
                            this._state.spriteOffsetX = this._animationLoopStartOffset;
                        } else {
                            this._state.spriteOffsetX += stfp.AnimatedSprite.FRAME_WIDTH;
                        }
                    } else {
                        if (this._state.spriteOffsetX <= this._animationLoopStartOffset){
                            this._state.spriteOffsetX = this._animationLoopEndOffset;
                        } else {
                            this._state.spriteOffsetX -= stfp.AnimatedSprite.FRAME_WIDTH;
                        }
                    }
                    if (this._state.spriteOffsetX >= this._animationLoopEndOffset ||
                        this._state.spriteOffsetX <= this._animationLoopStartOffset) {

                        if (this._animationOptions.oscillate === true) {
                            this._animationDirection *= -1;
                        }
                        if (this._animationOptions.singlerun === true) {
                            if (this._callback !== undefined) {
                                this._callback();
                            }
                            this._animationLoop = undefined;
                            return;
                        }
                    }
                }

                window.setTimeout(this._animationLoop, this._animationOptions.speed);

            }, this);

            window.setTimeout(this._animationLoop, this._animationOptions.speed);
        }
    }
});
stfp.AnimatedSprite.FRAME_WIDTH  = 64;

// Mixin class for moving sprites
//
// Requires: this._controller
//
stfp.MovingSprite = ge.Class.create({

    runMove : function (loopFrequency) {
        "use strict";
        var moveLoop = ge.bind(function () {
            if (this.move() !== false && this._controller.running === true) {
                window.setTimeout(moveLoop, loopFrequency);
            }
        }, this);
        window.setTimeout(moveLoop, loopFrequency);
    },

    // Move function which is executed periodically.
    // Should return false if movement should stop.
    move : function () {
    }

});