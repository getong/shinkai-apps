import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from '@shinkai_network/shinkai-i18n';
import {
  QuickConnectFormSchema,
  quickConnectFormSchema,
} from '@shinkai_network/shinkai-node-state/forms/auth/quick-connection';
import { useSubmitRegistrationNoCode } from '@shinkai_network/shinkai-node-state/v2/mutations/submitRegistation/useSubmitRegistrationNoCode';
import { useGetEncryptionKeys } from '@shinkai_network/shinkai-node-state/v2/queries/getEncryptionKeys/useGetEncryptionKeys';
import { useGetHealth } from '@shinkai_network/shinkai-node-state/v2/queries/getHealth/useGetHealth';
import {
  Button,
  ButtonProps,
  buttonVariants,
  ErrorMessage,
  Form,
  FormField,
  TextField,
} from '@shinkai_network/shinkai-ui';
import {
  submitRegistrationNoCodeError,
  submitRegistrationNoCodeNonPristineError,
} from '@shinkai_network/shinkai-ui/helpers';
import { cn } from '@shinkai_network/shinkai-ui/utils';
import { ArrowLeft } from 'lucide-react';
import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Link, To, useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { OnboardingStep } from '../components/onboarding/constants';
import { useShinkaiNodeEventsToast } from '../lib/shinkai-node-manager/shinkai-node-manager-hooks';
import { HOME_PATH } from '../routes/name';
import { useAuth } from '../store/auth';
import { useSettings } from '../store/settings';

export interface ConnectionOptionButtonProps extends ButtonProps {
  title: string;
  description: string;
  icon: React.ReactNode;
}

const ConnectionOptionButton = ({
  description,
  icon,
  title,
  className,
  ...props
}: ConnectionOptionButtonProps) => {
  return (
    <Button
      className={cn(
        'flex flex-1 cursor-pointer flex-col items-start gap-1 rounded-lg p-4 text-left',
        className,
      )}
      size="auto"
      variant="outline"
      {...props}
    >
      <div className="">{icon}</div>
      <p className="text-[15px] font-medium leading-none">{title}</p>
      <p className="text-xs text-gray-100">{description}</p>
    </Button>
  );
};
const LOCAL_NODE_ADDRESS = 'http://127.0.0.1:9850';

const QuickConnectionPage = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const setAuth = useAuth((state) => state.setAuth);
  useShinkaiNodeEventsToast();
  const { encryptionKeys } = useGetEncryptionKeys();
  const locationState = useLocation().state;
  const isShinkaiPrivate = locationState?.connectionType === 'local';
  const { nodeInfo, isSuccess: isNodeInfoSuccess } = useGetHealth(
    { nodeAddress: LOCAL_NODE_ADDRESS },
    { enabled: isShinkaiPrivate },
  );

  const completeStep = useSettings((state) => state.completeStep);

  const setupDataForm = useForm<QuickConnectFormSchema>({
    resolver: zodResolver(quickConnectFormSchema),
    defaultValues: {
      registration_name: 'main_device',
      node_address: isShinkaiPrivate
        ? LOCAL_NODE_ADDRESS
        : 'http://127.0.0.1:9550',
    },
  });

  const {
    isPending,
    isError,
    error,
    mutateAsync: submitRegistrationNoCode,
  } = useSubmitRegistrationNoCode({
    onSuccess: (response, setupPayload) => {
      if (response.status === 'success' && encryptionKeys) {
        const updatedSetupData = {
          ...encryptionKeys,
          ...setupPayload,
          permission_type: '',
          shinkai_identity:
            setupDataForm.getValues().shinkai_identity ||
            (response.data?.node_name ?? ''),
          node_signature_pk: response.data?.identity_public_key ?? '',
          node_encryption_pk: response.data?.encryption_public_key ?? '',
          api_v2_key: response.data?.api_v2_key ?? '',
        };
        setAuth(updatedSetupData);
        completeStep(OnboardingStep.TERMS_CONDITIONS, true);
        completeStep(OnboardingStep.ANALYTICS, false);
        navigate(HOME_PATH);
      } else if (response.status === 'non-pristine') {
        submitRegistrationNoCodeNonPristineError();
      } else {
        submitRegistrationNoCodeError();
      }
    },
  });

  async function onSubmit(currentValues: QuickConnectFormSchema) {
    if (!encryptionKeys) return;
    await submitRegistrationNoCode({
      profile: 'main',
      node_address: currentValues.node_address,
      registration_name: currentValues.registration_name,
      ...encryptionKeys,
    });
  }

  useEffect(() => {
    if (isNodeInfoSuccess && isShinkaiPrivate && nodeInfo?.is_pristine) {
      toast.loading(t('quickConnection.connectingToNode'), {
        id: 'auto-connect-shinkai-private',
      });
      setupDataForm.handleSubmit(onSubmit)();
    }
  }, [isNodeInfoSuccess, isShinkaiPrivate, nodeInfo, setupDataForm]);

  return (
    <div className="mx-auto flex size-full max-w-lg flex-col justify-between gap-8">
      <div className="flex flex-col">
        <div className="mb-4 flex items-center gap-2">
          <Link
            className={cn(
              buttonVariants({
                size: 'icon',
                variant: 'ghost',
              }),
            )}
            to={-1 as To}
          >
            <ArrowLeft className="h-6 w-6" />
          </Link>
          <h1 className="text-left text-2xl font-semibold">
            {t('quickConnection.label')} <span aria-hidden>⚡</span>
          </h1>
        </div>
        <Form {...setupDataForm}>
          <form
            className="space-y-6"
            onSubmit={setupDataForm.handleSubmit(onSubmit)}
          >
            <div className="space-y-4">
              <FormField
                control={setupDataForm.control}
                name="node_address"
                render={({ field }) => (
                  <TextField
                    field={field}
                    label={t('quickConnection.form.nodeAddress')}
                  />
                )}
              />
              {isError && <ErrorMessage message={error.message} />}
            </div>
            <Button
              className="w-full"
              disabled={isPending}
              isLoading={isPending}
              type="submit"
              variant="default"
            >
              {t('quickConnection.form.connect')}
            </Button>
          </form>
        </Form>
      </div>

      <div className="mt-4 flex flex-row justify-between gap-4">
        {/*<ConnectionOptionButton*/}
        {/*  className="h-32"*/}
        {/*  description={'Use the QR code to connect'}*/}
        {/*  icon={<QrCode className="text-gray-100" />}*/}
        {/*  onClick={() => {*/}
        {/*    navigate('/connect-qr');*/}
        {/*  }}*/}
        {/*  title={'QR Code'}*/}
        {/*/>*/}

        <ConnectionOptionButton
          description={t('restoreConnection.description')}
          icon={
            <span aria-hidden className="text-base">
              🔑
            </span>
          }
          onClick={() => {
            navigate('/restore');
          }}
          title={t('restoreConnection.restore')}
        />
      </div>
    </div>
  );
};

export default QuickConnectionPage;
