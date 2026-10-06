import { fireEvent, render, screen } from '@testing-library/react-native';
import type { ReactElement } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from '../theme/ThemeProvider';
import { Badge, SampleBadge } from './Badge';
import { Banner } from './Banner';
import { Button, IconButton } from './Button';
import { Chip, Switch, TextField } from './Field';
import { ConfirmDialog, Dialog } from './Overlay';
import { PermissionNotice, StaffBar } from './Staff';
import { AsyncStatus, PriceTag } from './Status';

const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, left: 0, right: 0, bottom: 34 } };
const renderThemed = (ui: ReactElement, scheme: 'light' | 'dark' = 'light') =>
  render(
    <SafeAreaProvider initialMetrics={metrics}>
      <ThemeProvider scheme={scheme}>{ui}</ThemeProvider>
    </SafeAreaProvider>,
  );

describe('Button', () => {
  it('is inert and busy while loading, announcing the progressive label', () => {
    const onPress = jest.fn();
    renderThemed(
      <Button loading loadingLabel="Confirming…" onPress={onPress}>
        Confirm
      </Button>,
    );
    const button = screen.getByRole('button', { name: 'Confirming…' });
    expect(button.props.accessibilityState).toMatchObject({ busy: true, disabled: true });
    fireEvent.press(button);
    expect(onPress).not.toHaveBeenCalled();
    expect(screen.queryByText('Confirm')).toBeNull();
  });

  it('presses when enabled', () => {
    const onPress = jest.fn();
    renderThemed(<Button onPress={onPress}>Book appointment</Button>);
    fireEvent.press(screen.getByRole('button', { name: 'Book appointment' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('icon buttons always carry an accessible name', () => {
    renderThemed(<IconButton icon="x" label="Close" />);
    expect(screen.getByRole('button', { name: 'Close' })).toBeTruthy();
  });
});

describe('status never by colour alone', () => {
  it('badges render their word, and Sample marks simulated data', () => {
    renderThemed(
      <>
        <Badge tone="success">Confirmed</Badge>
        <SampleBadge />
      </>,
    );
    expect(screen.getByText('Confirmed')).toBeTruthy();
    expect(screen.getByText('Sample')).toBeTruthy();
  });

  it('danger banners are alerts with a title and body', () => {
    renderThemed(
      <Banner tone="danger" title="Payment failed">
        Nothing was charged.
      </Banner>,
      'dark',
    );
    expect(screen.getByRole('alert')).toBeTruthy();
    expect(screen.getByText('Nothing was charged.')).toBeTruthy();
  });

  it('selected chips expose checked state', () => {
    renderThemed(<Chip selected>Skin</Chip>);
    expect(screen.getByRole('togglebutton', { name: 'Skin' }).props.accessibilityState).toMatchObject({ checked: true });
  });
});

describe('forms', () => {
  it('text fields keep a visible label and announce errors', () => {
    renderThemed(<TextField label="Email" error="Enter an email like name@example.com" />);
    expect(screen.getByText('Email')).toBeTruthy();
    expect(screen.getByLabelText('Email').props.accessibilityHint).toBe('Enter an email like name@example.com');
  });

  it('locked switches say "Always on" instead of a switch that cannot move', () => {
    renderThemed(<Switch label="Booking messages" value locked />);
    expect(screen.getByText('Always on')).toBeTruthy();
    expect(screen.queryByRole('switch')).toBeNull();
  });
});

describe('prices', () => {
  it('consultation shows no number', () => {
    renderThemed(<PriceTag kind="consultation" />);
    expect(screen.getByText('Consultation required')).toBeTruthy();
    expect(screen.queryByText(/\$/)).toBeNull();
  });

  it('"from" prices can never read as fixed', () => {
    renderThemed(<PriceTag kind="from" amount={120} />);
    expect(screen.getByLabelText('From $120.00')).toBeTruthy();
  });

  it('promo prices announce the regular price', () => {
    renderThemed(<PriceTag kind="promo" amount={199} was={250} endsAt="31 Oct, 11:59 pm PT" />);
    expect(screen.getByLabelText('$199.00, was $250.00. Offer ends 31 Oct, 11:59 pm PT')).toBeTruthy();
  });
});

describe('AsyncStatus', () => {
  it('pending is busy and shows a quotable reference', () => {
    renderThemed(<AsyncStatus state="pending" title="Checking your payment" reference="PAY-1" />);
    expect(screen.getByText('Reference PAY-1')).toBeTruthy();
  });
});

describe('dialogs', () => {
  it('Dialog cancel is the safe choice and confirm uses the specific verb', () => {
    const onCancel = jest.fn();
    const onConfirm = jest.fn();
    renderThemed(
      <Dialog visible title="Cancel this visit?" confirmLabel="Cancel visit" cancelLabel="Keep visit" destructive onCancel={onCancel} onConfirm={onConfirm} />,
    );
    fireEvent.press(screen.getByRole('button', { name: 'Keep visit' }));
    expect(onCancel).toHaveBeenCalled();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('ConfirmDialog states the consequence and the audit record', () => {
    renderThemed(<ConfirmDialog visible kind="archive" item="HydraFacial" onConfirm={jest.fn()} onCancel={jest.fn()} />);
    expect(screen.getByText('Archive HydraFacial?')).toBeTruthy();
    expect(screen.getByText('Customers stop seeing it. You can restore it any time.')).toBeTruthy();
    expect(screen.getByText('This is recorded in the audit log.')).toBeTruthy();
  });
});

describe('staff boundary', () => {
  it('StaffBar shows workspace, environment and role', () => {
    renderThemed(<StaffBar role="Owner" env="Staging" />);
    expect(screen.getByText('Staff workspace')).toBeTruthy();
    expect(screen.getByText('Staging')).toBeTruthy();
    expect(screen.getByText('Signed in as Owner')).toBeTruthy();
  });

  it('PermissionNotice explains the limit', () => {
    renderThemed(<PermissionNotice role="Editor" action="publish campaigns" />);
    expect(screen.getByText('Your role (Editor) can’t publish campaigns. An administrator can change your access; the server checks this too.')).toBeTruthy();
  });
});
