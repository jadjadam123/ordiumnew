(function(global, exports, perf) {
    'use strict';

    function fixSetTarget(param) {
        if (!param)
            return;
        if (!param.setTargetAtTime)
            param.setTargetAtTime = param.setTargetValueAtTime
    }
    if (window.hasOwnProperty('webkitAudioContext') && !window.hasOwnProperty('AudioContext')) {
        window.AudioContext = webkitAudioContext;
        if (!AudioContext.prototype.hasOwnProperty('createGain'))
            AudioContext.prototype.createGain = AudioContext.prototype.createGainNode;
        if (!AudioContext.prototype.hasOwnProperty('createDelay'))
            AudioContext.prototype.createDelay = AudioContext.prototype.createDelayNode;
        if (!AudioContext.prototype.hasOwnProperty('createScriptProcessor'))
            AudioContext.prototype.createScriptProcessor = AudioContext.prototype.createJavaScriptNode;
        if (!AudioContext.prototype.hasOwnProperty('createPeriodicWave'))
            AudioContext.prototype.createPeriodicWave = AudioContext.prototype.createWaveTable;
        AudioContext.prototype.internal_createGain = AudioContext.prototype.createGain;
        AudioContext.prototype.createGain = function() {
            var node = this.internal_createGain();
            fixSetTarget(node.gain);
            return node
        };
        AudioContext.prototype.internal_createDelay = AudioContext.prototype.createDelay;
        AudioContext.prototype.createDelay = function(maxDelayTime) {
            var node = maxDelayTime ? this.internal_createDelay(maxDelayTime) : this.internal_createDelay();
            fixSetTarget(node.delayTime);
            return node
        };
        AudioContext.prototype.internal_createBufferSource = AudioContext.prototype.createBufferSource;
        AudioContext.prototype.createBufferSource = function() {
            var node = this.internal_createBufferSource();
            if (!node.start) {
                node.start = function(when, offset, duration) {
                    if (offset || duration)
                        this.noteGrainOn(when || 0, offset, duration);
                    else this.noteOn(when || 0)
                }
            } else {
                node.internal_start = node.start;
                node.start = function(when, offset, duration) {
                    if (typeof duration !== 'undefined')
                        node.internal_start(when || 0, offset, duration);
                    else node.internal_start(when || 0, offset || 0)
                }
            }
            if (!node.stop) {
                node.stop = function(when) {
                    this.noteOff(when || 0)
                }
            } else {
                node.internal_stop = node.stop;
                node.stop = function(when) {
                    node.internal_stop(when || 0)
                }
            }
            fixSetTarget(node.playbackRate);
            return node
        };
        AudioContext.prototype.internal_createDynamicsCompressor = AudioContext.prototype.createDynamicsCompressor;
        AudioContext.prototype.createDynamicsCompressor = function() {
            var node = this.internal_createDynamicsCompressor();
            fixSetTarget(node.threshold);
            fixSetTarget(node.knee);
            fixSetTarget(node.ratio);
            fixSetTarget(node.reduction);
            fixSetTarget(node.attack);
            fixSetTarget(node.release);
            return node
        };
        AudioContext.prototype.internal_createBiquadFilter = AudioContext.prototype.createBiquadFilter;
        AudioContext.prototype.createBiquadFilter = function() {
            var node = this.internal_createBiquadFilter();
            fixSetTarget(node.frequency);
            fixSetTarget(node.detune);
            fixSetTarget(node.Q);
            fixSetTarget(node.gain);
            return node
        };
        if (AudioContext.prototype.hasOwnProperty('createOscillator')) {
            AudioContext.prototype.internal_createOscillator = AudioContext.prototype.createOscillator;
            AudioContext.prototype.createOscillator = function() {
                var node = this.internal_createOscillator();
                if (!node.start) {
                    node.start = function(when) {
                        this.noteOn(when || 0)
                    }
                } else {
                    node.internal_start = node.start;
                    node.start = function(when) {
                        node.internal_start(when || 0)
                    }
                }
                if (!node.stop) {
                    node.stop = function(when) {
                        this.noteOff(when || 0)
                    }
                } else {
                    node.internal_stop = node.stop;
                    node.stop = function(when) {
                        node.internal_stop(when || 0)
                    }
                }
                if (!node.setPeriodicWave)
                    node.setPeriodicWave = node.setWaveTable;
                fixSetTarget(node.frequency);
                fixSetTarget(node.detune);
                return node
            }
        }
    }
    if (window.hasOwnProperty('webkitOfflineAudioContext') && !window.hasOwnProperty('OfflineAudioContext')) {
        window.OfflineAudioContext = webkitOfflineAudioContext
    }
}(window));
var exports = {};
var actx = new AudioContext();
exports.actx = actx;
var sounds = {
    toLoad: 0,
    loaded: 0,
    audioExtensions: ["mp3", "ogg", "wav", "webm"],
    whenLoaded: undefined,
    onProgress: undefined,
    onFailed: function(source, error) {
        throw new Error("Audio could not be loaded: " + source)
    },
    load: function(sources) {
        var self = this;
        self.toLoad = sources.length;
        sources.forEach(function(source) {
            var extension = source.split('.').pop();
            if (self.audioExtensions.indexOf(extension) !== -1) {
                var soundSprite = makeSound(source, self.loadHandler.bind(self), !0, !1, self.onFailed);
                soundSprite.name = source;
                self[soundSprite.name] = soundSprite
            } else {}
        })
    },
    loadHandler: function(source) {
        var self = this;
        self.loaded += 1;
        if (self.onProgress) {
            self.onProgress(100 * self.loaded / self.toLoad, {
                url: source
            })
        }
        if (self.toLoad === self.loaded) {
            self.toLoad = 0;
            self.loaded = 0;
            if (self.whenLoaded) {
                self.whenLoaded()
            }
        }
    }
};
exports.sounds = sounds;

function makeSound(source, loadHandler, shouldLoadSound, xhr, failHandler) {
    var o = {};
    o.volumeNode = actx.createGain();
    if (!actx.createStereoPanner) {
        o.panNode = actx.createPanner()
    } else {
        o.panNode = actx.createStereoPanner()
    }
    o.delayNode = actx.createDelay();
    o.feedbackNode = actx.createGain();
    o.filterNode = actx.createBiquadFilter();
    o.convolverNode = actx.createConvolver();
    o.soundNode = null;
    o.buffer = null;
    o.source = source;
    o.loop = !1;
    o.playing = !1;
    o.loadHandler = undefined;
    o.panValue = 0;
    o.volumeValue = 1;
    o.startTime = 0;
    o.startOffset = 0;
    o.playbackRate = 1;
    o.echo = !1;
    o.delayValue = 0.3;
    o.feebackValue = 0.3;
    o.filterValue = 0;
    o.reverb = !1;
    o.reverbImpulse = null;
    o.play = function() {
        o.startTime = actx.currentTime;
        o.soundNode = actx.createBufferSource();
        o.soundNode.buffer = o.buffer;
        o.soundNode.playbackRate.value = this.playbackRate;
        o.soundNode.connect(o.volumeNode);
        if (o.reverb === !1) {
            o.volumeNode.connect(o.panNode)
        } else {
            o.volumeNode.connect(o.convolverNode);
            o.convolverNode.connect(o.panNode);
            o.convolverNode.buffer = o.reverbImpulse
        }
        o.panNode.connect(actx.destination);
        if (o.echo) {
            o.feedbackNode.gain.value = o.feebackValue;
            o.delayNode.delayTime.value = o.delayValue;
            o.filterNode.frequency.value = o.filterValue;
            o.delayNode.connect(o.feedbackNode);
            if (o.filterValue > 0) {
                o.feedbackNode.connect(o.filterNode);
                o.filterNode.connect(o.delayNode)
            } else {
                o.feedbackNode.connect(o.delayNode)
            }
            o.volumeNode.connect(o.delayNode);
            o.delayNode.connect(o.panNode)
        }
        o.soundNode.loop = o.loop;
        o.soundNode.start(0, o.startOffset % o.buffer.duration);
        o.playing = !0
    };
    o.pause = function() {
        if (o.playing) {
            o.soundNode.stop(0);
            o.startOffset += actx.currentTime - o.startTime;
            o.playing = !1
        }
    };
    o.restart = function() {
        if (o.playing) {
            o.soundNode.stop(0)
        }
        o.startOffset = 0;
        o.play()
    };
    o.playFrom = function(value) {
        if (o.playing) {
            o.soundNode.stop(0)
        }
        o.startOffset = value;
        o.play()
    };
    o.setEcho = function(delayValue, feedbackValue, filterValue) {
        if (delayValue === undefined) delayValue = 0.3;
        if (feedbackValue === undefined) feedbackValue = 0.3;
        if (filterValue === undefined) filterValue = 0;
        o.delayValue = delayValue;
        o.feebackValue = feedbackValue;
        o.filterValue = filterValue;
        o.echo = !0
    };
    o.setReverb = function(duration, decay, reverse) {
        if (duration === undefined) duration = 2;
        if (decay === undefined) decay = 2;
        if (reverse === undefined) reverse = !1;
        o.reverbImpulse = impulseResponse(duration, decay, reverse, actx);
        o.reverb = !0
    };
    o.fade = function(endValue, durationInSeconds) {
        if (o.playing) {
            o.volumeNode.gain.linearRampToValueAtTime(o.volumeNode.gain.value, actx.currentTime);
            o.volumeNode.gain.linearRampToValueAtTime(endValue, actx.currentTime + durationInSeconds)
        }
    };
    o.fadeIn = function(durationInSeconds) {
        o.volumeNode.gain.value = 0;
        o.fade(1, durationInSeconds)
    };
    o.fadeOut = function(durationInSeconds) {
        o.fade(0, durationInSeconds)
    };
    Object.defineProperties(o, {
        volume: {
            get: function() {
                return o.volumeValue
            },
            set: function(value) {
                o.volumeNode.gain.value = value;
                o.volumeValue = value
            },
            enumerable: !0,
            configurable: !0
        },
        pan: {
            get: function() {
                if (!actx.createStereoPanner) {
                    return o.panValue
                } else {
                    return o.panNode.pan.value
                }
            },
            set: function(value) {
                if (!actx.createStereoPanner) {
                    var x = value,
                        y = 0,
                        z = 1 - Math.abs(x);
                    o.panNode.setPosition(x, y, z);
                    o.panValue = value
                } else {
                    o.panNode.pan.value = value
                }
            },
            enumerable: !0,
            configurable: !0
        }
    });
    if (shouldLoadSound) {
        loadSound(o, source, loadHandler, failHandler)
    }
    if (xhr) {
        decodeAudio(o, xhr, loadHandler, failHandler)
    }
    return o
}
exports.makeSound = makeSound;

function loadSound(o, source, loadHandler, failHandler) {
    var xhr = new XMLHttpRequest();
    xhr.open("GET", source, !0);
    xhr.responseType = "arraybuffer";
    xhr.addEventListener("load", decodeAudio.bind(this, o, xhr, loadHandler, failHandler));
    xhr.send()
}
exports.loadSound = loadSound;

function decodeAudio(o, xhr, loadHandler, failHandler) {
    actx.decodeAudioData(xhr.response, function(buffer) {
        o.buffer = buffer;
        o.hasLoaded = !0;
        if (loadHandler) {
            loadHandler(o.source)
        }
    }, function(error) {
        if (failHandler) failHandler(o.source, error)
    })
}
exports.decodeAudio = decodeAudio;

function soundEffect(frequencyValue, attack, decay, type, volumeValue, panValue, wait, pitchBendAmount, reverse, randomValue, dissonance, echo, reverb, timeout) {
    if (frequencyValue === undefined) frequencyValue = 200;
    if (attack === undefined) attack = 0;
    if (decay === undefined) decay = 1;
    if (type === undefined) type = "sine";
    if (volumeValue === undefined) volumeValue = 1;
    if (panValue === undefined) panValue = 0;
    if (wait === undefined) wait = 0;
    if (pitchBendAmount === undefined) pitchBendAmount = 0;
    if (reverse === undefined) reverse = !1;
    if (randomValue === undefined) randomValue = 0;
    if (dissonance === undefined) dissonance = 0;
    if (echo === undefined) echo = undefined;
    if (reverb === undefined) reverb = undefined;
    if (timeout === undefined) timeout = undefined;
    var oscillator, volume, pan;
    oscillator = actx.createOscillator();
    volume = actx.createGain();
    if (!actx.createStereoPanner) {
        pan = actx.createPanner()
    } else {
        pan = actx.createStereoPanner()
    }
    oscillator.connect(volume);
    volume.connect(pan);
    pan.connect(actx.destination);
    volume.gain.value = volumeValue;
    if (!actx.createStereoPanner) {
        pan.setPosition(panValue, 0, 1 - Math.abs(panValue))
    } else {
        pan.pan.value = panValue
    }
    oscillator.type = type;
    var frequency;
    var randomInt = function(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min
    };
    if (randomValue > 0) {
        frequency = randomInt(frequencyValue - randomValue / 2, frequencyValue + randomValue / 2)
    } else {
        frequency = frequencyValue
    }
    oscillator.frequency.value = frequency;
    if (attack > 0) fadeIn(volume);
    fadeOut(volume);
    if (pitchBendAmount > 0) pitchBend(oscillator);
    if (echo) addEcho(volume);
    if (reverb) addReverb(volume);
    if (dissonance > 0) addDissonance();
    play(oscillator);

    function addReverb(volumeNode) {
        var convolver = actx.createConvolver();
        convolver.buffer = impulseResponse(reverb[0], reverb[1], reverb[2], actx);
        volumeNode.connect(convolver);
        convolver.connect(pan)
    }

    function addEcho(volumeNode) {
        var feedback = actx.createGain(),
            delay = actx.createDelay(),
            filter = actx.createBiquadFilter();
        delay.delayTime.value = echo[0];
        feedback.gain.value = echo[1];
        if (echo[2]) filter.frequency.value = echo[2];
        delay.connect(feedback);
        if (echo[2]) {
            feedback.connect(filter);
            filter.connect(delay)
        } else {
            feedback.connect(delay)
        }
        volumeNode.connect(delay);
        delay.connect(pan)
    }

    function fadeIn(volumeNode) {
        volumeNode.gain.value = 0;
        volumeNode.gain.linearRampToValueAtTime(0, actx.currentTime + wait);
        volumeNode.gain.linearRampToValueAtTime(volumeValue, actx.currentTime + wait + attack)
    }

    function fadeOut(volumeNode) {
        volumeNode.gain.linearRampToValueAtTime(volumeValue, actx.currentTime + attack + wait);
        volumeNode.gain.linearRampToValueAtTime(0, actx.currentTime + wait + attack + decay)
    }

    function pitchBend(oscillatorNode) {
        var frequency = oscillatorNode.frequency.value;
        if (!reverse) {
            oscillatorNode.frequency.linearRampToValueAtTime(frequency, actx.currentTime + wait);
            oscillatorNode.frequency.linearRampToValueAtTime(frequency - pitchBendAmount, actx.currentTime + wait + attack + decay)
        } else {
            oscillatorNode.frequency.linearRampToValueAtTime(frequency, actx.currentTime + wait);
            oscillatorNode.frequency.linearRampToValueAtTime(frequency + pitchBendAmount, actx.currentTime + wait + attack + decay)
        }
    }

    function addDissonance() {
        var d1 = actx.createOscillator(),
            d2 = actx.createOscillator(),
            d1Volume = actx.createGain(),
            d2Volume = actx.createGain();
        d1Volume.gain.value = volumeValue;
        d2Volume.gain.value = volumeValue;
        d1.connect(d1Volume);
        d1Volume.connect(actx.destination);
        d2.connect(d2Volume);
        d2Volume.connect(actx.destination);
        d1.type = "sawtooth";
        d2.type = "sawtooth";
        d1.frequency.value = frequency + dissonance;
        d2.frequency.value = frequency - dissonance;
        if (attack > 0) {
            fadeIn(d1Volume);
            fadeIn(d2Volume)
        }
        if (decay > 0) {
            fadeOut(d1Volume);
            fadeOut(d2Volume)
        }
        if (pitchBendAmount > 0) {
            pitchBend(d1);
            pitchBend(d2)
        }
        if (echo) {
            addEcho(d1Volume);
            addEcho(d2Volume)
        }
        if (reverb) {
            addReverb(d1Volume);
            addReverb(d2Volume)
        }
        play(d1);
        play(d2)
    }

    function play(node) {
        node.start(actx.currentTime + wait);
        node.stop(actx.currentTime + wait + 2)
    }
}
exports.soundEffect = soundEffect;

function impulseResponse(duration, decay, reverse, actx) {
    var length = actx.sampleRate * duration;
    var impulse = actx.createBuffer(2, length, actx.sampleRate);
    var left = impulse.getChannelData(0),
        right = impulse.getChannelData(1);
    for (var i = 0; i < length; i++) {
        var n;
        if (reverse) {
            n = length - i
        } else {
            n = i
        }
        left[i] = (Math.random() * 2 - 1) * Math.pow(1 - n / length, decay);
        right[i] = (Math.random() * 2 - 1) * Math.pow(1 - n / length, decay)
    }
    return impulse
}
exports.impulseResponse = impulseResponse;

function keyboard(keyCode) {
    var key = {};
    key.code = keyCode;
    key.isDown = !1;
    key.isUp = !0;
    key.press = undefined;
    key.release = undefined;
    key.downHandler = function(event) {
        if (event.keyCode === key.code) {
            if (key.isUp && key.press) key.press();
            key.isDown = !0;
            key.isUp = !1
        }
        event.preventDefault()
    };
    key.upHandler = function(event) {
        if (event.keyCode === key.code) {
            if (key.isDown && key.release) key.release();
            key.isDown = !1;
            key.isUp = !0
        }
        event.preventDefault()
    };
    window.addEventListener("keydown", key.downHandler.bind(key), !1);
    window.addEventListener("keyup", key.upHandler.bind(key), !1);
    return key
}
exports.keyboard = keyboard