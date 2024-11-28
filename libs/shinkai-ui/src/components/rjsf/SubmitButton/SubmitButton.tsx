import {
  FormContextType,
  getSubmitButtonOptions,
  RJSFSchema,
  StrictRJSFSchema,
  SubmitButtonProps,
} from '@rjsf/utils';

import { cn } from '../../../utils';
import { Button } from '../../button';

export default function SubmitButton<
  T = any,
  S extends StrictRJSFSchema = RJSFSchema,
  F extends FormContextType = any,
>(props: SubmitButtonProps<T, S, F>) {
  const {
    submitText,
    norender,
    props: submitButtonProps,
  } = getSubmitButtonOptions<T, S, F>(props.uiSchema);

  if (norender) {
    return null;
  }

  return (
    <div className="flex items-center justify-start">
      <Button
        {...submitButtonProps}
        className={cn(
          'h-[30px] rounded-lg border-gray-200 text-white',
          submitButtonProps?.className,
        )}
        size="sm"
        type="submit"
        variant="outline"
      >
        {submitText}
      </Button>
    </div>
  );
}