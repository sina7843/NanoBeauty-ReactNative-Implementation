import { fireEvent, render, screen } from '@testing-library/react-native';
import { useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from '../theme/ThemeProvider';
import { ListTextField, splitCommas, splitParagraphs } from './ListTextField';

const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };
const onItems = jest.fn();
function Harness() {
  const [items, setItems] = useState<string[]>([]);
  return <ListTextField label="Search words" items={items} onItems={(i) => (setItems(i), onItems(i))} split={splitCommas} join={(i) => i.join(', ')} />;
}

describe('ListTextField', () => {
  it('keeps trailing spaces and commas while typing and parses the list', () => {
    render(
      <SafeAreaProvider initialMetrics={metrics}>
        <ThemeProvider scheme="light">
          <Harness />
        </ThemeProvider>
      </SafeAreaProvider>,
    );
    const input = screen.getByLabelText('Search words');
    fireEvent.changeText(input, 'hifu, ');
    expect(screen.getByLabelText('Search words').props.value).toBe('hifu, ');
    fireEvent.changeText(input, 'hifu, face lift,');
    expect(screen.getByLabelText('Search words').props.value).toBe('hifu, face lift,');
    expect(onItems).toHaveBeenLastCalledWith(['hifu', 'face lift']);
  });

  it('splits answers on blank lines only', () => {
    expect(splitParagraphs('One line\nstill one\n\nSecond')).toEqual(['One line\nstill one', 'Second']);
  });
});

describe('eligible items (ST-16)', () => {
  it('reads "name, was, now" lines and skips unfinished ones', () => {
    const { splitEligible, joinEligible } = jest.requireActual('./ListTextField');
    const items = splitEligible('Signature facial, 180, 144\nLaser, 3 areas, $300, 240.50\nHalf typed, 90');
    expect(items).toEqual([
      { title: 'Signature facial', was: 180, now: 144 },
      { title: 'Laser, 3 areas', was: 300, now: 240.5 },
    ]);
    expect(joinEligible(items)).toBe('Signature facial, 180, 144\nLaser, 3 areas, 300, 240.5');
  });
});
