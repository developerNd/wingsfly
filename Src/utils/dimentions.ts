import { Dimensions } from 'react-native';

// Get usable width and height of the app screen
const Width: number = Dimensions.get('window').width;
const Height: number = Dimensions.get('window').height;
const FontSize: number = Dimensions.get('window').height;

// Accepts percentage as string or number
type Percentage = string | number;

// Get height based on percentage of screen height
export const HP = (percentage: Percentage): number => {
  const percentHeight: number = parseFloat(percentage.toString());
  return (Height * percentHeight) / 100;
};

// Get width based on percentage of screen width
export const WP = (percentage: Percentage): number => {
  const percentWidth: number = parseFloat(percentage.toString());
  return (Width * percentWidth) / 100;
};

// Get font size based on percentage of screen height
export const FS = (percentage: Percentage): number => {
  const percentFontSize: number = parseFloat(percentage.toString());
  return (FontSize * percentFontSize) / 100;
};
