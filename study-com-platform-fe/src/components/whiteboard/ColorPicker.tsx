import React from 'react';
import { Popover, Button } from 'antd';
import { SketchPicker } from 'react-color';

interface ColorPickerProps {
  color: string;
  onChange: (color: string) => void;
  disabled?: boolean;
}

export const ColorPickerComponent: React.FC<ColorPickerProps> = ({
  color,
  onChange,
  disabled = false
}) => {
  const presetColors = [
    '#000000', '#ffffff', '#ff0000', '#00ff00', '#0000ff',
    '#ffff00', '#ff00ff', '#00ffff', '#ffa500', '#800080',
    '#ffc0cb', '#a52a2a', '#808080', '#008000', '#000080'
  ];

  const handleChange = (newColor: any) => {
    onChange(newColor.hex);
  };

  const colorButtonStyle = {
    width: '32px',
    height: '32px',
    borderRadius: '4px',
    border: '1px solid #d9d9d9',
    backgroundColor: color,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1
  };

  return (
    <Popover
      content={
        <SketchPicker
          color={color}
          onChange={handleChange}
          presetColors={presetColors}
          disableAlpha
        />
      }
      trigger="click"
      placement="bottomLeft"
    >
      <Button 
        style={colorButtonStyle}
        disabled={disabled}
      />
    </Popover>
  );
};