import { fireEvent, render, screen } from '@testing-library/react-native';
import { useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from '../theme/ThemeProvider';
import { MoneyField } from './MoneyField';

const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };
const reported = jest.fn();
/** Like the package price: the form stores cents and can't store "empty", so a cleared field is kept as 0. */
function Harness({ outside }: { outside?: number }) {
  const [value, setValue] = useState(2500);
  const onDollars = (d: number | null) => {
    const c = Math.round((d ?? 0) * 100);
    setValue(c);
    reported(c);
  };
  return <MoneyField label="Price" dollars={(outside ?? value) / 100} onDollars={onDollars} />;
}
const wrap = (ui: React.ReactElement) => (
  <SafeAreaProvider initialMetrics={metrics}>
    <ThemeProvider scheme="light">{ui}</ThemeProvider>
  </SafeAreaProvider>
);

describe('MoneyField (ST-13)', () => {
  it('keeps "49." while typing, takes cents, and a cleared field stays empty', () => {
    render(wrap(<Harness />));
    const input = screen.getByLabelText('Price');
    fireEvent.changeText(input, '49.');
    expect(screen.getByLabelText('Price').props.value).toBe('49.');
    fireEvent.changeText(input, '49.99');
    expect(reported).toHaveBeenLastCalledWith(4999);
    fireEvent.changeText(input, '');
    expect(screen.getByLabelText('Price').props.value).toBe('');
    expect(reported).toHaveBeenLastCalledWith(0);
  });

  it('follows a value replaced from outside', () => {
    const { rerender } = render(wrap(<Harness />));
    rerender(wrap(<Harness outside={12000} />));
    expect(screen.getByLabelText('Price').props.value).toBe('120');
  });
});
