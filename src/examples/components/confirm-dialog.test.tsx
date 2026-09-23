import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConfirmDialog } from './confirm-dialog';

/** Renders the dialog closed, the way it first appears on the page. */
function renderDialog(onConfirm = jest.fn()) {
  render(
    <ConfirmDialog triggerLabel="Delete project" title="Delete this project?" confirmLabel="Delete" onConfirm={onConfirm}>
      This removes the project and all its tasks.
    </ConfirmDialog>,
  );
  return { onConfirm, trigger: screen.getByRole('button', { name: 'Delete project' }) };
}

describe('ConfirmDialog', () => {
  it('is closed until the trigger is clicked', () => {
    renderDialog();

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('opens with its title, its message, and focus on Cancel', async () => {
    const { trigger } = renderDialog();

    await userEvent.click(trigger);

    const dialog = screen.getByRole('dialog', { name: 'Delete this project?' });
    expect(dialog).toHaveTextContent('This removes the project and all its tasks.');
    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus();
  });

  it('closes on Cancel without confirming, and gives focus back to the trigger', async () => {
    const { onConfirm, trigger } = renderDialog();
    await userEvent.click(trigger);

    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(onConfirm).not.toHaveBeenCalled();
    expect(trigger).toHaveFocus();
  });

  it('closes when Escape is pressed', async () => {
    const { onConfirm, trigger } = renderDialog();
    await userEvent.click(trigger);

    await userEvent.keyboard('{Escape}');

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('confirms once and closes', async () => {
    const { onConfirm, trigger } = renderDialog();
    await userEvent.click(trigger);

    await userEvent.click(screen.getByRole('button', { name: 'Delete' }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('stays open with an error when confirming fails', async () => {
    const { trigger } = renderDialog(jest.fn().mockRejectedValue(new Error('server down')));
    await userEvent.click(trigger);

    await userEvent.click(screen.getByRole('button', { name: 'Delete' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/try again/i);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});
