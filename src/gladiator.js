/*
 Gladiator 3D engine

 by Matthias Ladkau (matthias@devt.de)

 JavaScript ray casting engine for pseudo 3D games.

 Based on:

 Creating pseudo 3D games with HTML 5 canvas and raycasting tutorial
 by Jacob Seidelin
 http://dev.opera.com/articles/view/creating-pseudo-3d-games-with-html-5-can-1/

 Ray-Casting Tutorial For Game Development And Other Purposes
 by F. Permadi
 http://www.permadi.com/tutorial/raycast/index.html

 Lode's Raycasting Tutorial
 by Lode Vandevenne
 http://lodev.org/cgtutor/index.html

 -------
The MIT License (MIT)

Copyright (c) 2013 Matthias Ladkau

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE
 -------
*/

if (ge === undefined) {
    var ge = {};
}

// Utility functions
// =================
ge.$ = function(id) { "use strict"; return document.getElementById(id); };
ge.create = function(tag) { "use strict"; return document.createElement(tag); };
ge.copyObject = function (o1, o2) { "use strict"; for (var attr in o1) { o2[attr] = o1[attr]; } };
ge.mergeObject = function (o1, o2) { "use strict"; for (var attr in o1) { if(o2[attr] === undefined) { o2[attr] = o1[attr]; } } };
ge.cloneObject = function (o) { "use strict"; var r = {}; ge.copyObject(o, r); return r; };
ge.bind = function () {
    "use strict";
    var f = arguments[0], t = Array.prototype.slice.call(arguments, 1);
    var a = t.splice(1);
    return function() {
        "use strict";
        return f.apply(t[0],
                       a.concat(Array.prototype.slice.call(arguments, 0)));
    }
};

// Class implementation
// ====================
// Class objects with constructor and multi-inheritance support
//
// Based on: Simple JavaScript Inheritance by John Resig
// http://ejohn.org/blog/simple-javascript-inheritance/
//
// Inspired by base2 and Prototype
//
ge.Class = function() {};
(function(){

    // Pattern which checks if a given function uses the function _super - this test
    // returns always true if toString on a function does not return the function code
    var functionUsesSuper = /abc/.test(function () { abc(); }) ? /\b_super\b/ : /.*/;

    // Flag which is used to detect if we are currently initialising
    var initializing = false;

    // Add create function to the new class object
    ge.Class.create = function() {

        // Get the current prototype as the super prototype of the new class
        var _super = this.prototype;

        // Clone the current class object (without running the init constructor function)
        initializing = true;
        var prototype = new this();
        initializing = false;

        // Go through all given mixin objects. Each object should be either
        // a normal properties object or a constructor function.
        for (var i = 0; i < arguments.length; i++) {
            var properties = arguments[i];

            // Check if the given mixin is a constructor funtion
            if (typeof properties === "function") {
                // Use the prototype as properties
                properties = properties.prototype;
            }

            // Copy the given properties to the cloned class object
            for (var name in properties) {

                // Check if we're overwriting an existing function and if the new function uses
                // it by calling _super
                if (typeof properties[name] == "function"
                    && typeof _super[name] == "function"
                    && functionUsesSuper.test(properties[name])) {

                // If _super is called we need to wrap the given function
                // in a closure and provide the right environment
                prototype[name] = (
                    function(name, func, _super) {
                        return function() {
                            var t, ret;
                            // Save the current value in _super
                            t = this._super;
                            // Add the function from the current class object as _super function
                            this._super = _super[name];
                            // Run the function which calls _super
                            ret = func.apply(this, arguments);
                            // Restore the old value in _super
                            this._super = t;
                            // Return the result
                            return ret;
                        };
                    }
                )(name, properties[name], _super);

                } else {

                    prototype[name] = properties[name];
                }
            }

            // Once the mixin is added it becomes the new super class
            // so we can have this._super call chains
            _super = properties;
        }

        // Defining a constructor function which is used to call the constructor function init on objects
        var Class = function () {
          if ( !initializing && this.init ) {
            this.init.apply(this, arguments);
          }
        }

        // Put our constructed prototype object in place
        Class.prototype = prototype;

        // Constructor of the new object should be Class
        // (this must be done AFTER the prototype was assigned)
        Class.prototype.constructor = Class;

        // The current function becomes the create function
        // on the new object
        Class.create = arguments.callee;

        return Class;
    };
})();

// Default Objects
// ===============
ge.default_eventHandler = {
    onkeydown : function(state, e) {
        "use strict";
        e = e || window.event;
        switch (e.keyCode) {
            case 38: state.player.speed =  1; break; // Move forward
            case 40: state.player.speed = -1; break; // Move backward
            case 39:
                if (e.ctrlKey || e.shiftKey) {
                    state.player.strafe =  1; // Strafe right
                } else {
                    state.player.dir =  1;    // Rotate right
                    if (state.player.rotSpeed < state.player.maxRotSpeed) {
                        state.player.rotSpeed = state.player.deltaRotSpeed(
                                                    state.player.rotSpeed);
                    }
                }
                break;
            case 37:
                if (e.ctrlKey || e.shiftKey) {
                    state.player.strafe = -1; // Strafe left
                } else {
                    state.player.dir = -1;    // Rotate left
                    if (state.player.rotSpeed < state.player.maxRotSpeed) {
                        state.player.rotSpeed = state.player.deltaRotSpeed(
                                                    state.player.rotSpeed);
                    }
                }
                break;
        }

        ge.default_eventHandler.stopBubbleEvent(e);
    },

    onkeyup : function(state, e) {
        "use strict";
        e = e || window.event;
        switch (e.keyCode) {
            case 38: case 40: state.player.speed = 0; break; // Stop moving
            case 37: case 39:
                // Stop rotating and strafing
                state.player.dir = 0;
                state.player.strafe = 0;
                state.player.rotSpeed = state.player.minRotSpeed;
                break;
        }

        ge.default_eventHandler.stopBubbleEvent(e);
    },

    // Stop the bubbling of an event
    stopBubbleEvent : function (e) {
        "use strict";
        e = e ? e:window.event;
        if (e.stopPropagation) {
            e.stopPropagation();
        }
        if (e.cancelBubble !== null) {
            e.cancelBubble = true;
        }
    }
};

ge.default_options = {

    // Scale of the minimap
    minimapScale       : 10,
    minimapPlayerColor : "blue",

    // Handler functions (registered on MainController construction)
    // =============================================================
    eventHandler : ge.default_eventHandler, // Key event handler

    // The following handler functions get the current game state object and
    // a list of all sprites ordered by distance to the player (far to near);

    moveHandler  : function (state, sprites) {},      // Handler called after each move
    drawHandler  : function (ctx, state, sprites) {}, // Handler called after each draw
                                                      // (gets also the draw context)

    // Texture options
    // ===============

    wallTextureAtlas   : "",
    wallTextureMapping : {},
    floorCeilingTextureAtlas   : "",
    floorCeilingTextureMapping : {},
    textureWidth  : 64,
    textureHeight : 64,

    ceilingImage          : undefined,    // Ceiling image
    ceilingSolidColor     : "gray",       // Ceiling solid color
    floorSolidColor       : "lightgray",  // Floor solid color

    // Rendering options
    // =================

    // Constant rate for moving
    moveRate       : 30,

    // View screen (projection plane) width
    screenWidth   : 320,
    screenHeight  : 200,

    screenElementWidth   : 320 * 1.5,
    screenElementHeight  : 200 * 1.5,

    // Width of each strip
    stripWidth    : 2,

    // Field of vision
    // Calculated by converting degrees in radians
    fov           : 60 * Math.PI / 180,

    // Min wall distance for player and sprites
    minDistToWall : 0.2,

    // The offset moves the sprite into the center of a tile
    spriteDrawOffsetX : 0.5,
    spriteDrawOffsetY : 0.5
};

ge.default_initial_player_state = {
    x : 2,  // Player x position
    y : 2,  // Player y position

    dir : 0,  // Turning direction (-1 for left, 1 for right, 0 no turning)
    rot : 0,  // Angle of rotation
    rotSpeed : Math.PI / 180,  // Current rotation speed for each
                                   // step (in radians) - the rotation
                                   // increases over time with default event handler
    maxRotSpeed   : 7 * Math.PI / 180,   // Max rotation speed
    minRotSpeed   : 2 * Math.PI / 180,   // Min rotation speed
    deltaRotSpeed : function(rotSpeed) { // Function to increase rotation speed
        return rotSpeed * 3;
    },

    speed     : 0,    // Moving direction (1 forward, -1 backwards, 0 no movement)
    strafe    : 0,    // Strafing direction of player (-1 left, 1 right, 0 no movement)
    moveSpeed : 0.21, // Move speed for each step

    crossHairSize : 1, // How many pixels constitute "middle" of the screen
                       // (used for hit detection)

    // Values set by the engine (updated every draw cycle)
    // ===================================================

    playerCrosshairHit : [],// List of sprites which are in
                            // the players cross hair
    spriteDistances :    {} // Object which holds all sprite ids
                            // mapped to their distance to the player
};

ge.default_initial_sprite_state = {
    id : "", // A unique ID
    x : 2,   // Sprite x position
    y : 2,   // Sprite y position

    isMoving       : false,
    drawOnMinimap : false,
    minimapColor   : "red",

    dir : 0,  // Turning direction (-1 for left, 1 for right, 0 no turning)
    rot : 0,  // Angle of rotation
    rotSpeed : 6 * Math.PI / 180,  // Rotation speed for each step (in radians)

    speed     : 0,    // Moving direction (1 forward, -1 backwards, 0 no movement)
    strafe    : 0,    // Strafing direction of player (-1 left, 1 right, 0 no movement)
    moveSpeed : 0.05, // Move speed for each step

    // Texture options
    // ===============

    spriteAtlas   : "", // Sprite image atlas
    spriteOffsetX : 0,  // Sprite offset on sprite atlas
    spriteOffsetY : 0,  // Sprite offset on sprite atlas
    spriteWidth   : 64, // Sprite size on sprite atlas
    spriteHeight  : 64, // Sprite size on sprite atlas
    spriteScaleX  : 1,  // Scale X of sprite
    spriteScaleY  : 1,  // Scale Y of sprite

    // Values set by the engine (updated every draw cycle)
    // ===================================================

    hitList          : [],       // List which contains which part of the
                                 // sprite are visible to the player
                                 // Each item is a list of 4 values:
                                 // Atlas x and size and Screen x and Size
    playerCrossHair  : undefined,// Which part of the sprite is in the players
                                 // cross hair (x pos on sprite atlas image)
    spriteAtlasImage : undefined // Sprite atlas image object
};

// Main Controller
// ===============
ge.MainController = ge.Class.create({

    // Constants
    TWO_PI   : Math.PI * 2,
    FOV_FLOOR_WEIGHT_TABLE : {
        10 : 5.50,
        20 : 2.80,
        30 : 1.85,
        40 : 1.35,
        45 : 1.15,
        50 : 1.00,
        55 : 0.95,
        60 : 0.85,
        65 : 0.75,
        70 : 0.65,
        75 : 0.60,
        80 : 0.55,
        85 : 0.50,
        90 : 0.45,
        95 : 0.40,
        100 : 0.35,
        110 : 0.30,
        120 : 0.25,
        130 : 0.20,
        140 : 0.15,
        150 : 0.12,
        160 : 0.08,
        170 : 0.03
    },

    // Object Attributes
    _screen  : undefined,
    _ctx     : undefined,
    _minimap : undefined,
    _options : undefined,
    _debug   : undefined,

    // Images
    _wallTextureAtlas : undefined,
    _skyImage         : undefined,

    // Runtime state
    _state   : undefined,
    _sprites : undefined,

    // Pre calculated values based on options
    _numRays        : undefined, // Numbers of rays to cast
    _halfFov        : undefined, // Half of the field of vision
    _viewDist       : undefined, // Distance from player to projection plane
    _fovFloorWeight : undefined, // FOV bound weight value for floor drawing
    _screenMiddle   : undefined, // Middle of projection plane

    // Volatile state
    _lastMoveLoopTime : 0,

    init : function(screen_id, minimap_id, options, debug_output_element) {
        "use strict";

        this.running  = true;
        this._state   = {};
        this._options = {};
        this._sprites = [];

        this._screen = ge.$(screen_id);

        if (this._screen === null) {
            throw Error("No main screen found");
        }
        this._ctx = this._screen.getContext("2d");

        this._minimap = ge.$(minimap_id);
        this._debug = ge.$(debug_output_element);

        // Set options
        ge.copyObject(ge.default_options, this._options);
        if (options !== undefined) {
            ge.copyObject(options, this._options);
        }

        // Load texture atlases
        this._wallTextureAtlas = new Image();
        this._wallTextureAtlas.src = this._options.wallTextureAtlas;
        this._floorCeilingTextureAtlas = new Image();
        this._floorCeilingTextureAtlas.src = this._options.floorCeilingTextureAtlas;

        // Load sky image if it was specified
        if (this._options.ceilingImage !== undefined) {
            this._skyImage = new Image();
            this._skyImage.src = this._options.ceilingImage;
        }

        // Set dimensions of main screen
        this._screen.width  = this._options.screenWidth;
        this._screen.height = this._options.screenHeight;
        this._screen.style.width  = this._options.screenElementWidth + "px";
        this._screen.style.height = this._options.screenElementHeight + "px";

        // Calculate constants which are based on the options
        this._screenMiddle = this._options.screenWidth / 2;
        this._numRays = Math.ceil(this._options.screenWidth / this._options.stripWidth);
        this._halfFov = this._options.fov / 2;

        // Find best fov floor weight value
        var match = 999;
        this._fovFloorWeight = 0.85 + 5;
        var fov_degrees = (this._options.fov / Math.PI) * 180;
        for (var fov_key in this.FOV_FLOOR_WEIGHT_TABLE) {
            var new_match = Math.abs(fov_key - fov_degrees);
            if (new_match < match) {
                this._fovFloorWeight = this.FOV_FLOOR_WEIGHT_TABLE[fov_key];
                match = new_match;
            }
            if (match === 0) {
                break;
            }
        }

        // Based on the screenWith and the field of vision
        // we can calculate the distance from player to
        // projection plane. tan(fov/2) = (screenWidth / 2) / viewDist
        this._viewDist = (this._options.screenWidth / 2) / Math.tan(this._options.fov / 2);

        this.registerEventHandlers();
    },

    start : function(map, initial_player_state) {
        "use strict";

        this._state.map = map;
        this._state.mapWidth  = map[0].length;
        this._state.mapHeight = map.length;

        // Merge given player state with default player state
        this._state.player = {};
        ge.copyObject(ge.default_initial_player_state, this._state.player);
        if (initial_player_state !== undefined) {
            ge.copyObject(initial_player_state, this._state.player);
        }

        if (this._minimap !== null) {
            this.drawMiniMap();
        }

        this.drawLoop();
        this.moveLoop();
    },

    stop : function () {
        "use strict";
        this.running = false;
        this.deRegisterEventHandlers();
    },

    addSprite : function(initial_sprite_state) {
        "use strict";

        // Merge given initial sprite state with default sprite state
        var sprite_state = {}
        if (initial_sprite_state !== undefined) {
            sprite_state = initial_sprite_state;
            ge.mergeObject(ge.default_initial_sprite_state, sprite_state);
        } else {
            ge.copyObject(ge.default_initial_sprite_state, sprite_state);
        }

        // Load the sprite atlas
        sprite_state.spriteAtlasImage = new Image();
        sprite_state.spriteAtlasImage.src = sprite_state.spriteAtlas

        // Add sprite to internal sprite map
        this._sprites.push(sprite_state);
    },

    registerEventHandlers : function (handlerObject) {
        "use strict";

        document.onkeydown = ge.bind(this._options.eventHandler.onkeydown, this, this._state);
        document.onkeyup = ge.bind(this._options.eventHandler.onkeyup, this, this._state);
    },

    deRegisterEventHandlers : function (handlerObject) {
        "use strict";

        document.onkeydown = null;
        document.onkeyup = null;
    },

    printDebug : function (str) {
        "use strict";

        if (this._debug !== null) {
            this._debug.innerHTML += str+"<br>";
        }
    },

    moveLoop : function () {
        "use strict";

        var moveLoopTime = new Date().getTime();
        var timeDelta = moveLoopTime - this._lastMoveCycleTime;

        // Do the move and compensation for the time delta
        this.move(timeDelta);

        // Calculate the next move time and adjust it according to the time lag
        var nextMoveLoopTime = 1000 / this._options.moveRate;
        if (timeDelta > nextMoveLoopTime) {
            nextMoveLoopTime = Math.max(1, nextMoveLoopTime
                                        - (timeDelta - nextMoveLoopTime));
        }

        // Call external handler
        this._options.moveHandler(this._state, this._sprites);

        this._lastMoveCycleTime = moveLoopTime;

        if (this.running) {
            setTimeout(ge.bind(this.moveLoop, this), nextMoveLoopTime);
        }
    },

    move : function (timeDelta) {
        "use strict";

        var player = this._state.player;

        // Calculate a correction multiplier for the time lag
        var timeCorrection = timeDelta / this._options.moveRate;
        if (isNaN(timeCorrection)) timeCorrection = 1;

        // Move the player first
        this.moveEntity(timeCorrection, player);

        // Move the sprites
        for(var i = 0; i < this._sprites.length; i++) {
            var sprite = this._sprites[i];
            if (sprite.isMoving) {
                this.moveEntity(timeCorrection, sprite);
            }
        }
    },

    moveEntity : function(timeCorrection, entity) {

        // Calculate new entity coordinates
        var moveStep = timeCorrection * entity.speed * entity.moveSpeed;
        var strafeStep = timeCorrection * entity.strafe * entity.moveSpeed;

        // Forward / backward movement
        var newX = entity.x + Math.cos(entity.rot) * moveStep;
        var newY = entity.y + Math.sin(entity.rot) * moveStep;

        // Left / right strafe movement
        newX -= Math.sin(entity.rot) * strafeStep;
        newY += Math.cos(entity.rot) * strafeStep;

        // Rotate the entity
        entity.rot += timeCorrection * entity.dir * entity.rotSpeed;

        // Stop if a entity collision is detected
        c = this.detectCollision(newX, newY, entity)

        // Move the entity
        if (!c[0]) {
            entity.x = newX;
        }
        if (!c[1]) {
            entity.y = newY;
        }
    },

    detectCollision : function (x, y, entity) {
        "use strict";

        var getMapEntry = ge.bind(function (x, y) {
            // Check if we have a sprite
            if (entity.id !== undefined) {
                // Correct x and y with the sprite draw offset
                x -= this._options.spriteDrawOffsetX;
                y -= this._options.spriteDrawOffsetY;
            }
            return this._state.map[Math.floor(y)][Math.floor(x)];
        }, this);

        // Fail-safe: Do not let the entity walk off the map
        if (x < 0 || x > this._state.mapWidth
            || y < 0 || y > this._state.mapHeight) {
            return [true, true];
        }

        var distToWall = this._options.minDistToWall;

        // Check for wall
        var collisionX = false,
            collisionY = false;

        if (getMapEntry(x, y+distToWall) > 0) {
            collisionY = true;
        } else if (getMapEntry(x, y-distToWall) > 0) {
            collisionY = true;
        }

        if (getMapEntry(x+distToWall, y) > 0) {
            collisionX = true;
        } else if (getMapEntry(x-distToWall, y) > 0) {
            collisionX = true;
        }

        return [collisionX, collisionY];
    },

    drawLoop : function () {
        "use strict";

        var start = 0;

        // Clear screen canvas
        var ctx = this._ctx;
        ctx.clearRect(0,0,this._screen.width,this._screen.height);

        if (this._debug !== null) {
            this._debug.innerHTML = "";
            start = new Date().getTime();
        }

        if (this._minimap !== null) {
            this.updateMiniMap();
        }

        this.drawSimpleCeilingAndGround();
        this.castRays();

        // Call external handler
        this._options.drawHandler(ctx, this._state, this._sprites);

        if (start !== 0) {
            // Calculate Runtime
            var runtime = new Date().getTime() - start;
            this.printDebug("Runtime:" + runtime);
            // Calculate FPS
            var now = new Date().getTime();
            var timeDelta = now - this._debug_lastRenderCycleTime;
            this._debug_lastRenderCycleTime = now;
            var fps = Math.floor(1000 / timeDelta);
            this.printDebug("FPS:" + fps);
        }

        if (this.running) {
            setTimeout(ge.bind(this.drawLoop, this), 20);
        }
    },

    drawSimpleCeilingAndGround : function () {
        "use strict";

        var ctx = this._ctx;
        var screenHeight = this._options.screenHeight;
        var screenHeightHalf = this._options.screenHeight / 2;
        var screenWidth = this._options.screenWidth;

        // Draw the ceiling and ground
        if (this._skyImage !== undefined) {
            this.circleImage(this._skyImage);
        } else {
            // Draw ceiling in solid color
            ctx.fillStyle = this._options.ceilingSolidColor;
            ctx.fillRect(0,0, screenWidth, screenHeightHalf);
        }

        // Draw floor in solid color
        ctx.fillStyle = this._options.floorSolidColor;
        ctx.fillRect(0, screenHeightHalf, screenWidth, screenHeightHalf);
    },

    drawMiniMap : function () {
        "use strict";

        var minimapScale = this._options.minimapScale,
            mapWidth = this._state.mapWidth,
            mapHeight = this._state.mapHeight,
            minimapWalls;

        if (this._minimapWalls === undefined) {
            this._minimapWalls = ge.create("canvas");
            this._minimapWalls.style.position = "absolute";
            this._minimapWalls.style.zIndex = 0;
            this._minimap.appendChild(this._minimapWalls);
        }

        var minimapWalls = this._minimapWalls;

        // Resize minimap canvas (internal and CSS dimensions)
        minimapWalls.width  = mapWidth  * minimapScale;
        minimapWalls.height = mapHeight * minimapScale;
        minimapWalls.style.width  = (mapWidth  * minimapScale) + "px";
        minimapWalls.style.height = (mapHeight * minimapScale) + "px";

        // Draw the minimap
        var ctx = minimapWalls.getContext("2d");

        for (var y = 0; y < mapHeight; y++) {
            for (var x = 0; x < mapWidth; x++) {
                var wall = this._state.map[y][x];
                if (wall > 0) {
                    ctx.fillStyle = "rgb(200,200,200)";
                    ctx.fillRect( x * minimapScale,
                                  y * minimapScale,
                                  minimapScale,
                                  minimapScale);
                }
            }
        }
    },

    updateMiniMap : function () {
        "use strict";

        if (this._minimapWalls === undefined) {
            this.drawMiniMap();
        }

        var player = this._state.player,
            options = this._options,
            minimapScale = this._options.minimapScale,
            mapWidth = this._state.mapWidth,
            mapHeight = this._state.mapHeight,
            minimapWalls;

        if (this._minimapObjects === undefined) {
            this._minimapObjects = ge.create("canvas");
            this._minimapObjects.style.position = "absolute";
            this._minimapObjects.style.zIndex = 1;
            this._minimap.appendChild(this._minimapObjects);
        }

        var miniMapObjects = this._minimapObjects;

        // Resize minimap canvas (internal and CSS dimensions)
        miniMapObjects.width  = mapWidth  * minimapScale;
        miniMapObjects.height = mapHeight * minimapScale;
        miniMapObjects.style.width  = (mapWidth  * minimapScale) + "px";
        miniMapObjects.style.height = (mapHeight * minimapScale) + "px";

        var ctx = miniMapObjects.getContext("2d");

        // Draw the player dot
        ctx.fillStyle = this._options.minimapPlayerColor;
        ctx.fillRect(
            player.x * minimapScale - 2,
            player.y * minimapScale - 2,
            4, 4
        );

        // Draw the player direction
        ctx.strokeStyle = this._options.minimapPlayerColor;
        ctx.beginPath();
        ctx.moveTo(player.x * minimapScale, player.y * minimapScale);
        ctx.lineTo(
            (player.x + Math.cos(player.rot) * 1) * minimapScale,
            (player.y + Math.sin(player.rot) * 1) * minimapScale
        );
        ctx.closePath();
        ctx.stroke();
    },

    castRays : function () {
        "use strict";

        // Viewdistance squared
        var viewDistSquare = this._viewDist * this._viewDist;

        // Leftmost ray position on projection plane
        var leftmostRayPos = -this._numRays / 2;

        var distArray = []

        for (var i = 0; i < this._numRays; i++) {

            // Which strip of the projection plane does this ray belong to
            var rayScreenPos = (leftmostRayPos + i) * this._options.stripWidth;

            // Distance of ray to the projection plane
            var rayViewLength = Math.sqrt(rayScreenPos * rayScreenPos + viewDistSquare);

            // Ray angle relative to the player view
            // right triangle: a = sin(A) * c
            var rayAngle = Math.asin(rayScreenPos / rayViewLength);

            // Calculate ray angle in the world by adding the current
            // players rotation and normalise the result (i.e. make
            // sure the result in radians is between 0 and 2*PI)
            rayAngle = this._state.player.rot + rayAngle;

            rayAngle %= this.TWO_PI;
            if (rayAngle < 0) {
                rayAngle += this.TWO_PI;
            }

            // Cast ray in the world
            var res = this.castSingleRay(rayAngle, i);

            // Debug code
            // this.drawRay(res[3], res[4]);

            // Counter fishbowl effect by correcting the distance - convert from oblique
            // distance to perpendicular distace oblique distance * cos(ray angle relative to player)
            var dist = res[0] * Math.cos(this._state.player.rot - rayAngle);
            distArray.push(dist);

            // Draw the strip of the ray
            this.drawStrip(i, dist, res[1], res[2], res[3], res[4], rayAngle);
        }

        if (this._sprites.length === 0) {
            return;
        }

        // Draw sprites

        // The offset moves the sprite into the center of a tile
        var spriteOffsetX = this._options.spriteDrawOffsetX;
        var spriteOffsetY = this._options.spriteDrawOffsetY;
        var ctx;

        // Sort sprites - far sprites to close sprites and get all the distances
        var sprite_dists = {};
        var getDistanceToPlayer = ge.bind(function (sprite) {
            "use strict";
            var sdx = sprite.x - this._state.player.x - spriteOffsetX;
            var sdy = sprite.y - this._state.player.y - spriteOffsetY;
            return Math.sqrt(sdx * sdx + sdy * sdy);
        }, this);

        if (this._sprites.length == 1) {
            sprite_dists[this._sprites[0].id] = getDistanceToPlayer(this._sprites[0]);
        } else {
            this._sprites.sort(function (sprite1, sprite2) {
                "use strict";
                var sd1, sd2;
                if (sprite_dists[sprite1.id] === undefined) {
                    sd1 = getDistanceToPlayer(sprite1);
                    sprite_dists[sprite1.id] = sd1;
                } else {
                    sd1 = sprite_dists[sprite1.id];
                }
                if (sprite_dists[sprite2.id] === undefined) {
                    sd2 = getDistanceToPlayer(sprite2);
                    sprite_dists[sprite2.id] = sd2;
                } else {
                    sd2 = sprite_dists[sprite2.id];
                }
                return sd2 - sd1;
            });
        }

        // Make the distances available in the player object
        this._state.player.spriteDistances = sprite_dists;
        var crossHairSize = this._state.player.crossHairSize;
        var screenMiddle = this._screenMiddle;
        var playerCrosshairHit = [];  // Collect all sprites which are in the middle of the
                                      // screen (players crosshair)

        // Now go through the sorted sprites and draw the far away ones first
        for(var i = 0; i < this._sprites.length; i++) {
            var sprite = this._sprites[i];
            var distSprite = sprite_dists[sprite.id];
            var xSprite = sprite.x  - spriteOffsetX;
            var ySprite = sprite.y  - spriteOffsetY;

            // Draw sprite on the minimap if the minimap is displayed
            if (this._minimapObjects !== undefined && sprite.drawOnMinimap) {

                ctx = this._minimapObjects.getContext("2d");
                ctx.fillStyle = sprite.minimapColor;
                ctx.fillRect(xSprite  * this._options.minimapScale,
                             ySprite * this._options.minimapScale,
                             4,
                             4);
            }

            // Calculate Sprite angle relative to player and sprite size
            xSprite = xSprite - this._state.player.x;
            ySprite = ySprite - this._state.player.y;
            var spriteAngle = Math.atan2(ySprite, xSprite) - this._state.player.rot;
            var size = this._viewDist / (Math.cos(spriteAngle) * distSprite);

            // Don't draw sprite if it has no size
            if (size <= 0) {
                continue;
            }

            var screenWidth = this._options.screenWidth;
            var screenHeight = this._options.screenHeight;

            // Calculate position and size of sprite
            var x = Math.floor(screenWidth / 2 + Math.tan(spriteAngle)
                               * this._viewDist - size * sprite.spriteScaleX / 2);
            var y = Math.floor(this._options.screenHeight / 2
                               - (0.55 + sprite.spriteScaleY - 1) * size);
            var sx = Math.floor(size * sprite.spriteScaleX);
            var sy = Math.ceil(sprite.spriteHeight * 0.01 * size)
                               + (0.45 + sprite.spriteScaleY - 1)  * size;

            // Determine which parts of the sprite should be drawn
            ctx = this._ctx;
            var stripWidth = this._options.stripWidth;

            // Draw function for sprites - it knows already the height
            // but needs to know stripes to draw
            var drawSprite = function(tx, tw, sx, sw) {
                "use strict";
                if (tw <= 0 || sw <= 0) {
                    return;
                }
                ctx.drawImage(sprite.spriteAtlasImage, tx, sprite.spriteOffsetY,
                              tw, sprite.spriteHeight, sx, y, sw, sy);

                // Check for crosshair hit
                if (sx <= screenMiddle+crossHairSize-1
                    && sx+sw >= screenMiddle-crossHairSize+1) {
                    sprite.playerCrossHair = (screenMiddle-sx) * tw / sw;
                    playerCrosshairHit.push(sprite);
                };
            };

            var tx = sprite.spriteOffsetX;  // Horizontal offset in sprite atlas
            var ts = sprite.spriteWidth;    // Horizontal size in sprite atlas
            var cumulativeDS = 0;  // Cumulative size of current set of stripes to
                                            // draw on screen
            var cumulativeTS = 0;  // Cumulative size of current set of stripes to
                                            // draw in the sprite atlas

            var strips = sx / stripWidth; // Number of sprite stripes to draw

            var drawing = false;          // If true then we are collecting stripes to draw

            var execute_draw = false;     // If true then all stripes to draw have been
                                          // collected (i.e. the next stripes will be invisible)

            sprite.hitList = [];          // List which collects which parts of the sprite are visible
                                          // by the player - list contains lists of 4 values:
                                          // texture strip offset, texture strip size,
                                          // screen strip offset, screen strip size

            for (var j = 0; j < strips; j++) {

                // Calculate cumulative sizes
                cumulativeDS += stripWidth;
                cumulativeTS = Math.floor(cumulativeDS * sprite.spriteWidth / sx);
                cumulativeTS = cumulativeTS > sprite.spriteWidth
                                   ? sprite.spriteWidth : cumulativeTS;

                // Calculate index in distance list
                var distIndex = Math.floor((x + cumulativeDS) * (distArray.length) / (screenWidth));

                // Get distance of wall for current strip
                var distWall = distArray[distIndex];

                var distDelta = distWall - distSprite;

                // Check if the sprite strip is before the wall and in the players view
                // (Allow for increasing rounding errors depending on the distance)
                if (distWall === undefined || distDelta < -0.1 * distSprite) {
                    // The sprite part is outside of the players view or behind a wall
                    if (drawing) {
                        // If we were collection stripes now is the time to execute the
                        // draw operation as the current strip is invisible
                        execute_draw=true;
                    }
                    drawing = false;
                } else {
                    // Sprite is visible
                    if (!drawing) {
                        // If the previous strips were invisible then the current strip is the first
                        // which will be drawn
                        drawing = true;
                        x = x + cumulativeDS;
                        tx = tx + cumulativeTS;
                        cumulativeDS = 0;
                        cumulativeTS = 0;
                    }
                }

                if (execute_draw) {
                    // Execute the draw and continue with the loop
                    drawSprite(tx,cumulativeTS,x,cumulativeDS);
                    sprite.hitList.push([tx,cumulativeTS,x,cumulativeDS])
                    execute_draw = false;
                    drawing = false;
                } else if (j+1 >= strips && drawing) {
                    // We are at the end of the loop and still collecting strips to draw -
                    // draw the visible bits and exit
                    drawSprite(tx,cumulativeTS,x,cumulativeDS);
                    sprite.hitList.push([tx,cumulativeTS,x,cumulativeDS])
                    break;
                }
            }
        }

        this._state.player.playerCrosshairHit = playerCrosshairHit;
    },

    castSingleRay : function (rayAngle, stripIdx) {
        "use strict";

        var distx, disty;

        // Calculate direction for the bresenham algorithm
        var right = (rayAngle > this.TWO_PI * 0.75
                     || rayAngle < this.TWO_PI * 0.25);
        var up = (rayAngle < 0 || rayAngle > Math.PI);

        // Calculate ray vector
        var v_x = Math.cos(rayAngle);
        var v_y = Math.sin(rayAngle);

        // Calculate variables for vertical search
        var slope_v = v_y / v_x;
        var dx_v = right ? 1 : -1;
        var dy_v = dx_v * slope_v;
        var x_v = right ? Math.ceil(this._state.player.x) : Math.floor(this._state.player.x);
        var y_v = this._state.player.y + (x_v - this._state.player.x) * slope_v
        var do_v = true;

        var dist_v = -1;
        var xHit_v = 0;
        var yHit_v = 0;
        var wallType_v = 0;
        var wallx_v,wally_v, texturex_v;

        // Calculate variables for horizontal search
        var slope_h = v_x / v_y;
        var dy_h = up ? -1 : 1;
        var dx_h = dy_h * slope_h;
        var y_h = up ? Math.floor(this._state.player.y) : Math.ceil(this._state.player.y);
        var x_h = this._state.player.x + (y_h - this._state.player.y) * slope_h;
        var do_h = true;

        var dist_h = -1;
        var xHit_h = 0;
        var yHit_h = 0;
        var wallType_h = 0;
        var wallx_h,wally_h, texturex_h;

        // Search for the wall
        while (do_h || do_v) {

            do_h = (do_h) ? (x_h >= 0 && x_h < this._state.mapWidth &&
                             y_h >= 0 && y_h < this._state.mapHeight) : false;
            do_v = (do_v) ? (x_v >= 0 && x_v < this._state.mapWidth &&
                             y_v >= 0 && y_v < this._state.mapHeight) : false;

            if (do_v) {
                // Perform vertical search
                wallx_v = Math.floor(x_v + (right ? 0 : -1));
                wally_v = Math.floor(y_v);

                // Check if we hit a wall
                wallType_v = this._state.map[wally_v][wallx_v];
                if (wallType_v > 0) {
                    distx = x_v - this._state.player.x;
                    disty = y_v - this._state.player.y;
                    dist_v = distx * distx + disty * disty;
                    xHit_v = x_v;
                    yHit_v = y_v;

                    texturex_v = y_v % 1;
                    if (!right) {
                        texturex_v = 1 - texturex_v;
                    }

                    do_v = false;
                }
                x_v += dx_v;
                y_v += dy_v;
            }
            if (do_h) {
                // Perform horizontal search
                wally_h = Math.floor(y_h + (up ? -1 : 0));
                wally_h = wally_h < 0 ? 0 : wally_h;
                wallx_h = Math.floor(x_h);

                // Check if we hit a wall
                wallType_h = this._state.map[wally_h][wallx_h];
                if (wallType_h > 0) {
                    distx = x_h - this._state.player.x;
                    disty = y_h - this._state.player.y;
                    dist_h = distx * distx + disty * disty;
                    xHit_h = x_h;
                    yHit_h = y_h;

                    texturex_h = x_h % 1;
                    if (up) {
                        texturex_h = 1 - texturex_h;
                    }

                    do_h = false;
                }
                x_h += dx_h;
                y_h += dy_h;
            }
        }

        if (dist_h !== -1 && (dist_v === -1 || dist_v > dist_h)) {
            return [Math.sqrt(dist_h), texturex_h, wallType_h, xHit_h, yHit_h];
        } else {
            return [Math.sqrt(dist_v), texturex_v, wallType_v, xHit_v, yHit_v];
        }
    },


    drawStrip : function(index, dist, texturex, wallType, hitX, hitY, rayAngle) {
        "use strict";

        // Draw Walls

        // Get texture offset for wall
        var textureWidth = this._options.textureWidth,
            textureHeight = this._options.textureHeight,
            screenHeight = this._options.screenHeight,
            stripWidth = this._options.stripWidth,
            ctx = this._ctx;
        var textureOffset = this._options.wallTextureMapping[wallType];
        var textureOffset_h = textureOffset !== undefined ? textureOffset[0] : 0,
            textureOffset_v = textureOffset !== undefined ? textureOffset[1] : 0;

        // Calculate wallheight on projection plane.
        // Assume real wall height is 1 unit:
        // dist     = 1
        // viewDist = ?
		var height = Math.round(this._viewDist / dist);

        // Horizontal position of the strip is strip index * strip width
        var x = index * stripWidth;

        // Place all stripes at the center of the screen
		var y = Math.round((screenHeight - height) / 2);

        try {
            ctx.drawImage(this._wallTextureAtlas,

                          // Which part of the texture should be drawn
                          Math.floor(textureOffset_h +
                                     texturex * textureWidth),
                          // Vertical offset on texture image
                          textureOffset_v,

                          1,  // Strip on texture image is always 1 pixel
                          textureHeight, // Texture height
                          x,  // Horizontal position on projection plane
                          y,  // Vertical position on projection plane
                          stripWidth, // Width of strip
                          height); // Height of strip
        } catch(e) {
            throw Error("Could not use wall texture atlas: " + e)
        }

        // Perform floorcasting

        // Floor space to draw
        var fheight = (screenHeight - height) / 2;

        // Vertical offset on projection plance
        var foffset = y + height;

        // Fudge factor to draw the floor tiles at the right position taking into account
        // screen aspect ratio and field of vision
        var fweight = (this._options.screenWidth / screenHeight)
                       * this._fovFloorWeight

        // Ray vector (to calculate the floor tile pixel position on world map
        var vx = (hitX - this._state.player.x) / dist;
        var vy = (hitY - this._state.player.y) / dist;

        // Bottom of the screen
        var bottom = foffset + fheight;

        for (var fy = 0; fy < fheight; fy++) {

            // Calculate current distance
            var currentDist = bottom / (2 * (fy + foffset) - bottom);

            // Calculate coordinates of pixel in the world
            var wx = this._state.player.x + vx * currentDist * fweight;
            var wy = this._state.player.y + vy * currentDist * fweight;
            var mx = Math.floor(wx);
            var my = Math.floor(wy);

            // Get the floor type
            var floorType = this._state.map[my][mx];

            var floorTexturex = ((wx * textureWidth) % textureWidth) ;
            var floorTexturey = ((wy * textureHeight) % textureHeight) ;

            if (floorType >= 0) {
                continue;
            }

            // Draw the floor pixel
            textureOffset = this._options.floorCeilingTextureMapping[floorType];
            var textureOffset_floor_h = textureOffset !== undefined ? textureOffset[0][0] : 0,
                textureOffset_floor_v = textureOffset !== undefined ? textureOffset[0][1] : 0,
                textureOffset_ceiling_h = textureOffset !== undefined ? textureOffset[1][0] : 0,
                textureOffset_ceiling_v = textureOffset !== undefined ? textureOffset[1][1] : 0;

            try {
                ctx.drawImage(this._floorCeilingTextureAtlas,
                              floorTexturex + textureOffset_floor_h,
                              floorTexturey + textureOffset_floor_v,
                              1, 1, x, fy + foffset, stripWidth ,1);
            } catch(e) {
                throw Error("Could not use floor texture atlas: " + e)
            }

            // Draw the ceiling pixel which is simply mirrored
            var ct = fheight - fy;

            try {
                // Draw with double stripWith on screen, otherwise we have
                // some small holes in the ceiling
                ctx.drawImage(this._floorCeilingTextureAtlas,
                              floorTexturex + textureOffset_ceiling_h,
                              floorTexturey + textureOffset_ceiling_v,
                              1, 1, x, ct, stripWidth * 2 ,1);
            } catch(e) {
                throw Error("Could not use ceiling texture atlas: " + e)
            }
        }
    },

    circleImage : function (image) {
        "use strict";
        var rot,
            skyWidth = this._options.screenWidth,
            leftOverWidth = 0,
            ctx = this._ctx,
            screenHeight = this._options.screenHeight,
            screenWidth = this._options.screenWidth,
            xoffset;

        // Calculate positive player rotation offset
        xoffset = this._state.player.rot;
        xoffset %= this.TWO_PI;
        if (xoffset < 0) {
            xoffset += this.TWO_PI;
        }

        // Calculate offset on image
        rot = xoffset * (image.width / this.TWO_PI);

        // If the image is too small we need to draw multiple times
        if (rot + skyWidth > image.width) {
            leftOverWidth = rot + skyWidth - image.width;
            skyWidth -= leftOverWidth;
        }

        if (skyWidth > 0) {

            ctx.drawImage(image,
                          rot, 0, skyWidth, screenHeight / 2,
                          0, 0, skyWidth, screenHeight / 2);
        }

        if (leftOverWidth > 0) {
            ctx.drawImage(image,
                          0, 0, leftOverWidth, screenHeight / 2,
                          skyWidth - 1, 0, leftOverWidth, screenHeight / 2);
        }
    },

    drawRay : function (rayX, rayY) {
        "use strict";

        var minimapObjects = this._minimapObjects;
        var ctx = minimapObjects.getContext("2d");

        ctx.strokeStyle = "rgba(0,100,0,0.3)";
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(this._state.player.x * this._options.minimapScale, this._state.player.y * this._options.minimapScale);
        ctx.lineTo(
            rayX * this._options.minimapScale,
            rayY * this._options.minimapScale
        );
        ctx.closePath();
        ctx.stroke();
    }
});
