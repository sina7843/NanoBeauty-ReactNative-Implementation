import { fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from '../theme/ThemeProvider';
import { WallTimeField } from './WallTimeField';

const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };

describe('WallTimeField (ST-4)', () => {
  it('reports half-typed or impossible times as invalid and keeps the last value out of the form', () => {
    const onChange = jest.fn();
    const onValidity = jest.fn();
    render(
      <SafeAreaProvider initialMetrics={metrics}>
        <ThemeProvider scheme="light">
          <WallTimeField label="Send at" iso={null} tz="America/Toronto" onChange={onChange} onValidity={onValidity} />
        </ThemeProvider>
      </SafeAreaProvider>,
    );
    const input = screen.getByLabelText('Send at');
    fireEvent.changeText(input, '2026-10-3');
    expect(onValidity).toHaveBeenLastCalledWith(false);
    fireEvent.changeText(input, '2026-10-30 25:00');
    expect(onValidity).toHaveBeenLastCalledWith(false);
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.changeText(input, '2026-10-30 10:00');
    expect(onValidity).toHaveBeenLastCalledWith(true);
    expect(onChange).toHaveBeenLastCalledWith('2026-10-30T14:00:00.000Z');
  });
});
