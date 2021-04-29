import React from 'react';
import {View} from 'react-native';
import ColorPicker, {rgb2Hsv} from './components/ColorPicker';

const initialColor = '#FF0000';

const initialHsv = rgb2Hsv(initialColor);

class App extends React.Component {
  state = {
    currentColor: initialColor,
    hsv: initialHsv,
  };

  onColorChangeComplete = (_, hsv) => {
    this.setState({hsv}, () => {
      console.log(this.state.hsv);
    });
  };

  render() {
    return (
      <ColorPicker
        color={this.state.currentColor}
        onColorChangeComplete={this.onColorChangeComplete}
        thumbSize={40}
        noSnap={true}
        row={false}
        swatches={false}
      />
    );
  }
}

export default App;
