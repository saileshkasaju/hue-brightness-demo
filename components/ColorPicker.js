import React from 'react';

import {Animated, Image, PanResponder, StyleSheet, View} from 'react-native';

import Elevations from 'react-native-elevation';
import Slider from '@react-native-community/slider';
const srcWheel = require('./assets/color-wheel.png');

const RGB_MAX = 255;
const HUE_MAX = 360;
const SV_MAX = 100;

const normalize = degrees => ((degrees % 360) + 360) % 360;

export const rgb2Hsv = (r, g, b) => {
  if (typeof r === 'object') {
    const args = r;
    r = args.r;
    g = args.g;
    b = args.b;
  }

  // It converts [0,255] format, to [0,1]
  r = r === RGB_MAX ? 1 : (r % RGB_MAX) / parseFloat(RGB_MAX);
  g = g === RGB_MAX ? 1 : (g % RGB_MAX) / parseFloat(RGB_MAX);
  b = b === RGB_MAX ? 1 : (b % RGB_MAX) / parseFloat(RGB_MAX);

  let max = Math.max(r, g, b);
  let min = Math.min(r, g, b);
  let h,
    s,
    v = max;

  let d = max - min;

  s = max === 0 ? 0 : d / max;

  if (max === min) {
    h = 0; // achromatic
  } else {
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }

  return {
    h: Math.round(h * HUE_MAX),
    s: Math.round(s * SV_MAX),
    v: Math.round(v * SV_MAX),
  };
};

export const hsv2Rgb = (h, s, v) => {
  if (typeof h === 'object') {
    const args = h;
    h = args.h;
    s = args.s;
    v = args.v;
  }

  h = normalize(h);
  h = h === HUE_MAX ? 1 : ((h % HUE_MAX) / parseFloat(HUE_MAX)) * 6;
  s = s === SV_MAX ? 1 : (s % SV_MAX) / parseFloat(SV_MAX);
  v = v === SV_MAX ? 1 : (v % SV_MAX) / parseFloat(SV_MAX);

  let i = Math.floor(h);
  let f = h - i;
  let p = v * (1 - s);
  let q = v * (1 - f * s);
  let t = v * (1 - (1 - f) * s);
  let mod = i % 6;
  let r = [v, q, p, p, t, v][mod];
  let g = [t, v, v, q, p, p][mod];
  let b = [p, p, t, v, v, q][mod];

  return {
    r: Math.floor(r * RGB_MAX),
    g: Math.floor(g * RGB_MAX),
    b: Math.floor(b * RGB_MAX),
  };
};

export const rgb2Hex = (r, g, b) => {
  if (typeof r === 'object') {
    const args = r;
    r = args.r;
    g = args.g;
    b = args.b;
  }
  r = Math.round(r).toString(16);
  g = Math.round(g).toString(16);
  b = Math.round(b).toString(16);

  r = r.length === 1 ? '0' + r : r;
  g = g.length === 1 ? '0' + g : g;
  b = b.length === 1 ? '0' + b : b;

  return '#' + r + g + b;
};

export const hex2Rgb = hex => {
  let result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
};

export const hsv2Hex = (h, s, v) => {
  let rgb = hsv2Rgb(h, s, v);
  return rgb2Hex(rgb.r, rgb.g, rgb.b);
};

export const hex2Hsv = hex => {
  let rgb = hex2Rgb(hex);
  return rgb2Hsv(rgb.r, rgb.g, rgb.b);
};

class ColorPicker extends React.Component {
  color = {h: 0, s: 0, v: 100};
  slideX = new Animated.Value(0);
  slideY = new Animated.Value(0);
  panX = new Animated.Value(30);
  panY = new Animated.Value(30);
  sliderLength = 0;
  wheelSize = 0;
  sliderMeasure = {};
  wheelMeasure = {};
  wheelWidth = 0;
  sliderAnim = new Animated.Value(0);
  static defaultProps = {
    row: false,
    noSnap: false,
    thumbSize: 50,
    discrete: false,
    color: '#ffffff',
    onColorChange: () => {},
    onColorChangeComplete: () => {},
  };
  wheelPanResponder = PanResponder.create({
    onStartShouldSetPanResponderCapture: (event, gestureState) => {
      const {nativeEvent} = event;
      if (this.outOfWheel(nativeEvent)) return;
      this.wheelMovement(event, gestureState);
      this.updateHueSaturation({nativeEvent});
      return true;
    },
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponderCapture: () => true,
    onPanResponderGrant: (event, gestureState) => {
      const {locationX, locationY} = event.nativeEvent;
      const {moveX, moveY, x0, y0} = gestureState;
      const x = x0 - locationX,
        y = y0 - locationY;
      this.wheelMeasure.x = x;
      this.wheelMeasure.y = y;
      return true;
    },
    onPanResponderMove: (event, gestureState) => {
      if (
        this.outOfWheel(event.nativeEvent) ||
        this.outOfBox(this.wheelMeasure, gestureState)
      )
        return;
      this.wheelMovement(event, gestureState);
    },
    onMoveShouldSetPanResponder: () => true,
    onPanResponderRelease: (event, gestureState) => {
      const {nativeEvent} = event;
      const {radius} = this.polar(nativeEvent);
      const {hsv} = this.state;
      if (!this.props.noSnap && radius <= 0.1 && radius >= 0)
        this.animate('#ffffff', 'hs', false, true);
      if (!this.props.noSnap && radius >= 0.95 && radius <= 1)
        this.animate(this.state.currentColor, 'hs', true);
      if (this.props.onColorChangeComplete)
        this.props.onColorChangeComplete(hsv2Hex(hsv), hsv);
      this.setState({currentColor: this.state.currentColor});
    },
  });
  constructor(props) {
    super(props);
    this.mounted = false;
    this.state = {
      wheelOpacity: 0,
      sliderOpacity: 0,
      hueSaturation: hsv2Hex(this.color.h, this.color.s, 100),
      currentColor: props.color,
      hsv: {h: 0, s: 0, v: 100},
    };
    this.wheelMovement = new Animated.event(
      [
        {
          nativeEvent: {
            locationX: this.panX,
            locationY: this.panY,
          },
        },
        null,
      ],
      {listener: this.updateHueSaturation},
    );
  }
  componentDidMount() {
    this.mounted = true;
  }
  componentWillUnmount() {
    this.mounted = false;
  }
  onSliderSlide = (val, i = 0) => {
    this.sliderAnim.stopAnimation();
    Animated.timing(this.sliderAnim, {
      toValue: 1,
      duration: 500,
    }).start(x => {
      this.sliderAnim.setValue(0);
    });
    this.updateValue({nativeEvent: null}, val);
    this.animate({h: this.color.h, s: this.color.s, v: val}, 'v');
  };
  onSquareLayout = e => {
    let {x, y, width, height} = e.nativeEvent.layout;
    this.wheelWidth = Math.min(width, height);
    this.tryForceUpdate();
  };
  onWheelLayout = e => {
    /*
     * const {x, y, width, height} = nativeEvent.layout
     * onlayout values are different than measureInWindow
     * x and y are the distances to its previous element
     * but in measureInWindow they are relative to the window
     */
    this.wheel.measureInWindow((x, y, width, height) => {
      this.wheelMeasure = {x, y, width, height};
      this.wheelSize = width;
      // this.panX.setOffset(-width/2)
      // this.panY.setOffset(-width/2)
      this.update(this.state.currentColor);
      this.setState({wheelOpacity: 1});
    });
  };
  onSliderLayout = e => {
    this.slider.measureInWindow((x, y, width, height) => {
      this.sliderMeasure = {x, y, width, height};
      this.sliderLength = this.props.row ? height - width : width - height;
      // this.slideX.setOffset(-width/2)
      // this.slideY.setOffset(-width/2)
      this.update(this.state.currentColor);
      this.setState({sliderOpacity: 1});
    });
  };
  outOfBox(measure, gestureState) {
    const {x, y, width, height} = measure;
    const {moveX, moveY, x0, y0} = gestureState;
    // console.log(`${moveX} , ${moveY} / ${x} , ${y} / ${locationX} , ${locationY}`);
    return !(
      moveX >= x &&
      moveX <= x + width &&
      moveY >= y &&
      moveY <= y + height
    );
  }
  outOfWheel(nativeEvent) {
    const {radius} = this.polar(nativeEvent);
    return radius > 1;
  }
  val(v) {
    const d = this.props.discrete,
      r = 11 * Math.round(v / 11);
    return d ? (r >= 99 ? 100 : r) : v;
  }
  ratio(nativeEvent) {
    const row = this.props.row;
    const loc = row ? nativeEvent.locationY : nativeEvent.locationX;
    const {width, height} = this.sliderMeasure;
    return 1 - loc / (row ? height - width : width - height);
  }
  polar(nativeEvent) {
    const lx = nativeEvent.locationX,
      ly = nativeEvent.locationY;
    const [x, y] = [lx - this.wheelSize / 2, ly - this.wheelSize / 2];
    return {
      deg: Math.atan2(y, x) * (-180 / Math.PI),
      radius: Math.sqrt(y * y + x * x) / (this.wheelSize / 2),
    };
  }
  cartesian(deg, radius) {
    const r = (radius * this.wheelSize) / 2; // was normalized
    const rad = (Math.PI * deg) / 180;
    const x = r * Math.cos(rad);
    const y = r * Math.sin(rad);
    return {
      left: this.wheelSize / 2 + x,
      top: this.wheelSize / 2 - y,
    };
  }
  updateHueSaturation = ({nativeEvent}) => {
    const {deg, radius} = this.polar(nativeEvent),
      h = deg,
      s = 100 * radius,
      v = this.color.v;
    // if(radius > 1 ) return
    const hsv = {h, s, v};
    const currentColor = hsv2Hex(hsv);
    this.color = hsv;
    this.setState({
      hsv,
      currentColor,
      hueSaturation: hsv2Hex(this.color.h, this.color.s, 100),
    });
    this.props.onColorChange(hsv2Hex(hsv));
  };
  updateValue = ({nativeEvent}, val) => {
    const {h, s} = this.color,
      v = typeof val == 'number' ? val : 100 * this.ratio(nativeEvent);
    const hsv = {h, s, v};
    const currentColor = hsv2Hex(hsv);
    this.color = hsv;
    this.setState({
      hsv,
      currentColor,
      hueSaturation: hsv2Hex(this.color.h, this.color.s, 100),
    });
    this.props.onColorChange(hsv2Hex(hsv));
  };
  update = (color, who, max, force) => {
    const specific = typeof who == 'string',
      who_hs = who == 'hs',
      who_v = who == 'v';
    let {h, s, v} = typeof color == 'string' ? hex2Hsv(color) : color,
      stt = {};
    h = who_hs || !specific ? h : this.color.h;
    s =
      who_hs && max
        ? 100
        : who_hs && max === false
        ? 0
        : who_hs || !specific
        ? s
        : this.color.s;
    v =
      who_v && max
        ? 100
        : who_v && max === false
        ? 0
        : who_v || !specific
        ? v
        : this.color.v;
    const range = ((100 - v) / 100) * this.sliderLength;
    const {left, top} = this.cartesian(h, s / 100);
    const hsv = {h, s, v};
    if (!specific || force) {
      this.color = hsv;
      stt.hueSaturation = hsv2Hex(this.color.h, this.color.s, 100);
      // this.setState({hueSaturation: hsv2Hex(this.color.h,this.color.s,100)})
    }
    stt.currentColor = hsv2Hex(hsv);
    this.setState(stt, x => {
      this.tryForceUpdate();
    });
    // this.setState({currentColor:hsv2Hex(hsv)}, x=>this.tryForceUpdate())
    this.props.onColorChange(hsv2Hex(hsv));
    if (this.props.onColorChangeComplete)
      this.props.onColorChangeComplete(hsv2Hex(hsv), hsv);
    if (who_hs || !specific) {
      this.panY.setValue(top); // - this.props.thumbSize / 2)
      this.panX.setValue(left); // - this.props.thumbSize / 2)
    }
    if (who_v || !specific) {
      this.slideX.setValue(range);
      this.slideY.setValue(range);
    }
  };
  animate = (color, who, max, force) => {
    const specific = typeof who == 'string',
      who_hs = who == 'hs',
      who_v = who == 'v';
    let {h, s, v} = typeof color == 'string' ? hex2Hsv(color) : color,
      stt = {};
    h = who_hs || !specific ? h : this.color.h;
    s =
      who_hs && max
        ? 100
        : who_hs && max === false
        ? 0
        : who_hs || !specific
        ? s
        : this.color.s;
    v =
      who_v && max
        ? 100
        : who_v && max === false
        ? 0
        : who_v || !specific
        ? v
        : this.color.v;
    const range = ((100 - v) / 100) * this.sliderLength;
    const {left, top} = this.cartesian(h, s / 100);
    const hsv = {h, s, v};
    // console.log(hsv);
    if (!specific || force) {
      this.color = hsv;
      stt.hueSaturation = hsv2Hex(this.color.h, this.color.s, 100);
      // this.setState({hueSaturation: hsv2Hex(this.color.h,this.color.s,100)})
    }
    stt.currentColor = hsv2Hex(hsv);
    this.setState(stt, x => {
      this.tryForceUpdate();
    });
    // this.setState({currentColor:hsv2Hex(hsv)}, x=>this.tryForceUpdate())
    this.props.onColorChange(hsv2Hex(hsv));
    if (this.props.onColorChangeComplete)
      this.props.onColorChangeComplete(hsv2Hex(hsv), hsv);
    let anims = [];
    if (who_hs || !specific)
      anims.push(
        //{//
        Animated.spring(this.panX, {toValue: left, friction: 90}), //.start()//
        Animated.spring(this.panY, {toValue: top, friction: 90}), //.start()//
      ); //}//
    if (who_v || !specific)
      anims.push(
        //{//
        Animated.spring(this.slideX, {toValue: range, friction: 90}), //.start()//
        Animated.spring(this.slideY, {toValue: range, friction: 90}), //.start()//
      ); //}//
    Animated.parallel(anims).start();
  };
  // componentWillReceiveProps(nextProps) {
  // 	const { color } = nextProps
  // 	if(color !== this.props.color) this.animate(color)
  // }
  revert() {
    if (this.mounted) this.animate(this.props.color);
  }
  tryForceUpdate() {
    if (this.mounted) this.forceUpdate();
  }
  render() {
    const {style, thumbSize, row} = this.props;
    const hsv = hsv2Hex(this.color);
    const wheelPanHandlers =
      (this.wheelPanResponder && this.wheelPanResponder.panHandlers) || {};
    const opacity = this.state.wheelOpacity; // * this.state.sliderOpacity
    const wheelThumbStyle = {
      width: thumbSize,
      height: thumbSize,
      borderRadius: thumbSize / 2,
      backgroundColor: hsv,
      transform: [{translateX: -thumbSize / 2}, {translateY: -thumbSize / 2}],
      left: this.panX,
      top: this.panY,
      opacity,
    };
    return (
      <View style={[ss.root, row ? {flexDirection: 'row'} : {}, style]}>
        <View style={[ss.wheel]} key={'$1'} onLayout={this.onSquareLayout}>
          <View
            style={[
              {
                padding: thumbSize / 2,
                width: this.wheelWidth,
                height: this.wheelWidth,
              },
            ]}>
            <View style={[ss.wheelWrap]}>
              <Image style={ss.wheelImg} source={srcWheel} />
              <Animated.View
                style={[
                  ss.wheelThumb,
                  wheelThumbStyle,
                  Elevations[4],
                  {pointerEvents: 'none'},
                ]}
              />
              <View
                style={[ss.cover]}
                onLayout={this.onWheelLayout}
                {...wheelPanHandlers}
                ref={r => {
                  this.wheel = r;
                }}
              />
            </View>
          </View>
        </View>
        <>
          <Slider
            style={{
              width: 200,
              height: 40,
              flex: 1,
            }}
            value={hsv?.v || 100}
            minimumValue={0}
            maximumValue={100}
            onValueChange={val => {
              this.onSliderSlide(val);
            }}
          />
        </>
      </View>
    );
  }
}

export default ColorPicker;

const ss = StyleSheet.create({
  root: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'space-between',
    overflow: 'visible',
    // aspectRatio: 1,
    // backgroundColor: '#ffcccc',
  },
  wheel: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'visible',
    width: '100%',
    minWidth: 200,
    minHeight: 200,
    // aspectRatio: 1,
    // backgroundColor: '#ffccff',
  },
  wheelWrap: {
    width: '100%',
    height: '100%',
    // backgroundColor: '#ffffcc',
  },
  wheelImg: {
    width: '100%',
    height: '100%',
    // backgroundColor: '#ffffcc',
  },
  wheelThumb: {
    position: 'absolute',
    backgroundColor: '#EEEEEE',
    borderWidth: 3,
    borderColor: '#EEEEEE',
    elevation: 4,
    shadowColor: 'rgb(46, 48, 58)',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.8,
    shadowRadius: 2,
  },
  cover: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    // backgroundColor: '#ccccff88',
  },
});
