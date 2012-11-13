define(["kick/math/Mat4", "kick/math/Vec3", "kick/math/Quat4", "kick/core/Constants", "kick/core/Util"], function (Mat4, Vec3, Quat4, Constants, Util) {
    "use strict";

    var ASSERT = Constants._ASSERT,
        Transform;

    /**
     * Position, rotation and scale of a game object. This component should not be created manually.
     * It is created when a GameObject is created.
     *
     * KickJS uses a right handed coordinate system.
     * @namespace KICK.scene
     * @class Transform
     * @extends KICK.scene.Component
     */
    Transform = function (gameObject) {
        var localMatrix = Mat4.identity(Mat4.create()),
            globalMatrix = Mat4.identity(Mat4.create()),
            localMatrixInverse = Mat4.identity(Mat4.create()),
            globalMatrixInverse = Mat4.identity(Mat4.create()),
            globalPosition = Vec3.create([0, 0, 0]),
            localPosition = Vec3.create([0, 0, 0]),
            globalRotationQuat = Quat4.create([0, 0, 0, 1]),
            localRotationQuat = Quat4.create([0, 0, 0, 1]),
            localScale = Vec3.create([1, 1, 1]),
            // the dirty parameter let the
            LOCAL = 0,
            LOCAL_INV = 1,
            GLOBAL = 2,
            GLOBAL_INV = 3,
            GLOBAL_POSITION = 4,
            GLOBAL_ROTATION = 5,
            dirty = new Int8Array(6), // local,localInverse,global,globalInverse
            children = [],
            parentTransform = null,
            thisObj = this,
            markGlobalDirty = function () {
                var i;
                dirty[GLOBAL] = 1;
                dirty[GLOBAL_INV] = 1;
                dirty[GLOBAL_POSITION] = 1;
                dirty[GLOBAL_ROTATION] = 1;
                for (i = children.length - 1; i >= 0; i--) {
                    children[i]._markGlobalDirty();
                }
            },
            markLocalDirty = function () {
                dirty[LOCAL] = 1;
                dirty[LOCAL_INV] = 1;
                markGlobalDirty();
            };

        Object.defineProperties(this, {
            // inherit description from GameObject
            gameObject: {
                value: gameObject
            },
            /**
             * Global position.
             * @property position
             * @type KICK.math.vec3
             */
            position: {
                get: function () {
                    // if no parent - use local position
                    if (parentTransform === null) {
                        return Vec3.create(localPosition);
                    }
                    if (dirty[GLOBAL_POSITION]) {
                        Mat4.multiplyVec3(thisObj.getGlobalMatrix(), [0, 0, 0], globalPosition);
                        dirty[GLOBAL_POSITION] = 0;
                    }
                    return Vec3.create(globalPosition);
                },
                set: function (newValue) {
                    var currentPosition;
                    if (parentTransform === null) {
                        thisObj.localPosition = newValue;
                        return;
                    }
                    currentPosition = thisObj.position;
                    Vec3.set(newValue, localPosition);
                    thisObj.localPosition = [
                        localPosition[0] + currentPosition[0] - newValue[0],
                        localPosition[1] + currentPosition[1] - newValue[1],
                        localPosition[2] + currentPosition[2] - newValue[2]
                    ];
                    markLocalDirty();
                }
            },
            /**
             * Local position.
             * @property localPosition
             * @type KICK.math.vec3
             */
            localPosition: {
                get: function () {
                    return Vec3.create(localPosition);
                },
                set: function (newValue) {
                    Vec3.set(newValue, localPosition);
                    markLocalDirty();
                }
            },
            /**
             * Local rotation in euler angles.
             * @property localRotationEuler
             * @type KICK.math.vec3
             */
            localRotationEuler: {
                get: function () {
                    var vec = Vec3.create();
                    Quat4.toEuler(localRotationQuat, vec);
                    return vec;
                },
                set: function (newValue) {
                    Quat4.setEuler(newValue, localRotationQuat);
                    markLocalDirty();
                }
            },
            /**
             * Global rotation in euler angles.
             * @property rotationEuler
             * @type KICK.math.vec3
             */
            rotationEuler: {
                get: function () {
                    var vec = Vec3.create();
                    Quat4.toEuler(thisObj.rotation, vec);
                    return vec;
                },
                set: function (newValue) {
                    var tmp = Quat4.create();
                    Quat4.setEuler(newValue, tmp);
                    this.rotation = tmp;
                }
            },

            /**
             * Global rotation in quaternion.
             * @property rotation
             * @type KICK.math.quat4
             */
            rotation: {
                get: function () {
                    var parentIterator = null;
                    if (parentTransform === null) {
                        return Quat4.create(localRotationQuat);
                    }
                    if (dirty[GLOBAL_ROTATION]) {
                        Quat4.set(localRotationQuat, globalRotationQuat);
                        parentIterator = thisObj.parent;
                        while (parentIterator !== null) {
                            Quat4.multiply(parentIterator.localRotation, globalRotationQuat, globalRotationQuat);
                            parentIterator = parentIterator.parent;
                        }
                        dirty[GLOBAL_ROTATION] = false;
                    }
                    return globalRotationQuat;
                },
                set: function (newValue) {
                    if (parentTransform === null) {
                        this.localRotation = newValue;
                        return;
                    }
                    var rotationDifference = Quat4.create();
                    Quat4.difference(newValue, thisObj.rotation, rotationDifference);
                    this.localRotation = Quat4.multiply(localRotationQuat, rotationDifference);
                }
            },
            /**
             * Local rotation in quaternion.
             * @property localRotation
             * @type KICK.math.quat4
             */
            localRotation: {
                get: function () {
                    return localRotationQuat;
                },
                set: function (newValue) {
                    Quat4.set(newValue, localRotationQuat);
                    markLocalDirty();
                }
            },
            /**
             * Local scale.
             * Any zero value will be replaced with an epsilon value.
             * @property localScale
             * @type KICK.math.vec3
             */
            localScale: {
                get: function () {
                    return Vec3.create(localScale);
                },
                set: function (newValue) {
                    var i;
                    Vec3.set(newValue, localScale);
                    // replace 0 value with epsilon to prevent a singular matrix
                    for (i = 0; i < localScale.length; i++) {
                        if (localScale[i] === 0) {
                            localScale[i] = Constants._EPSILON;
                        }
                    }
                    markLocalDirty();
                }
            },
            /**
             * Array of children. The children should not be modified directly. Instead use the parent property
             * @property children
             * @type Array_KICK.scene.Transform
             */
            children: {
                value: children
            },
            /**
             * Parent transform. Initial null.
             * @property parent
             * @type KICK.scene.Transform
             */
            parent: {
                get: function () {
                    return parentTransform;
                },
                set: function (newParent) {
                    if (newParent === this) {
                        Util.fail('Cannot assign parent to self');
                    }
                    if (ASSERT) {
                        if (typeof newParent === 'undefined') {
                            Util.fail("Cannot set newParent to undefined - should be null");
                        }
                    }
                    if (newParent !== parentTransform) {
                        if (newParent === null) {
                            parentTransform = null;
                            Util.removeElementFromArray(newParent.children, this);
                        } else {
                            parentTransform = newParent;
                            newParent.children.push(this);
                        }
                        markGlobalDirty();
                    }
                }
            }
        });

        /**
         *
         * Todo: known issue does not work when thisObj has parent object
         * @method lookAt
         * @param {KICK.scene.Transform} transform target object to look at
         * @param {Object} type the constructor of the wanted component
         * @return {KICK.math.mat4} local transformation
         */
        this.lookAt = function (transform, up) {
            if (ASSERT) {
                if (!(transform instanceof Transform)) {
                    Util.fail("transform must be a KICK.scene.Transform");
                }
            }
            Quat4.lookAt(thisObj.position, transform.position, up, localRotationQuat);
            markLocalDirty();
        };

        /**
         * Return the local transformation matrix
         * @method getLocalMatrix
         * @return {KICK.math.mat4} local transformation
         */
        this.getLocalMatrix = function () {
            if (dirty[LOCAL]) {
                Mat4.setTRS(localPosition, localRotationQuat, localScale, localMatrix);
                dirty[LOCAL] = 0;
            }
            return localMatrix;
        };

        /**
         * Return the local inverse of translate rotate scale
         * @method getLocalTRSInverse
         * @return {KICK.math.mat4} inverse of local transformation
         */
        this.getLocalTRSInverse = function () {
            if (dirty[LOCAL_INV]) {
                Mat4.setTRSInverse(localPosition, localRotationQuat, localScale, localMatrixInverse);
                dirty[LOCAL_INV] = 0;
            }
            return localMatrixInverse;
        };

        /**
         * @method getGlobalMatrix
         * @return {KICK.math.mat4} global transform
         */
        this.getGlobalMatrix = function () {
            if (dirty[GLOBAL]) {
                Mat4.set(thisObj.getLocalMatrix(), globalMatrix);

                var transformIterator = thisObj.parent;
                while (transformIterator !== null) {
                    Mat4.multiply(transformIterator.getLocalMatrix(), globalMatrix, globalMatrix);
                    transformIterator  = transformIterator.parent;
                }
                dirty[GLOBAL] = 0;
            }
            return globalMatrix;
        };

        /**
         * Return the inverse of global rotate translate transform
         * @method getGlobalTRSInverse
         * @return {KICK.math.mat4} inverse global transform
         */
        this.getGlobalTRSInverse = function () {
            if (dirty[GLOBAL_INV]) {
                Mat4.set(thisObj.getLocalTRSInverse(), globalMatrixInverse);
                var transformIterator = thisObj.parent;
                while (transformIterator !== null) {
                    Mat4.multiply(globalMatrixInverse, transformIterator.getLocalTRSInverse(), globalMatrixInverse);
                    transformIterator  = transformIterator.parent;
                }
                dirty[GLOBAL_INV] = 0;
            }
            return globalMatrixInverse;
        };

        /**
         * Mark the global transform updated.
         * This will mark the transform updated (meaning the global transform must be recomputed based on
         * translation, rotation, scale)
         * @method markGlobalDirty
         * @private
         */
        this._markGlobalDirty = markGlobalDirty;

        /**
         * @method toJSON
         * @return {Object} JSON formatted object
         */
        this.toJSON = function () {
            var typedArrayToArray = Util.typedArrayToArray;
            if (ASSERT) {
                if (!thisObj.gameObject || !thisObj.gameObject.engine) {
                    Util.fail("Cannot serialize a Transform object that has no reference to gameObject/engine");
                }
            }
            return {
                type: "KICK.scene.Transform",
                uid: gameObject.engine.getUID(thisObj),
                config: {
                    localPosition: typedArrayToArray(localPosition),
                    localRotation: typedArrayToArray(localRotationQuat),
                    localScale: typedArrayToArray(localScale),
                    parent: parentTransform ? Util.getJSONReference(thisObj.gameObject.engine, parentTransform) : null
                }
            };
        };

        /**
         * @method str
         * @return {String} stringify JSON
         */
        this.str = function () {
            return JSON.stringify(thisObj.toJSON());
        };
    };

    return Transform;
});