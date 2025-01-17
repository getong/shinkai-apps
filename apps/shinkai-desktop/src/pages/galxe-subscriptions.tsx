import { zodResolver } from '@hookform/resolvers/zod';
import { CheckCircledIcon, CircleIcon } from '@radix-ui/react-icons';
import { useTranslation } from '@shinkai_network/shinkai-i18n';
import { Inbox } from '@shinkai_network/shinkai-message-ts/api/jobs/types';
import { useGetListDirectoryContents } from '@shinkai_network/shinkai-node-state/v2/queries/getDirectoryContents/useGetListDirectoryContents';
import { useGetInboxes } from '@shinkai_network/shinkai-node-state/v2/queries/getInboxes/useGetInboxes';
import { useGetMySubscriptions } from '@shinkai_network/shinkai-node-state/v2/queries/getMySubscriptions/useGetMySubscriptions';
import {
  Button,
  buttonVariants,
  CopyToClipboardIcon,
  Form,
  FormField,
  TextField,
} from '@shinkai_network/shinkai-ui';
import { cn } from '@shinkai_network/shinkai-ui/utils';
import { ExternalLinkIcon } from 'lucide-react';
import { useEffect } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { z } from 'zod';

import {
  useGalxeGenerateProofQuery,
  useGalxeRegisterShinkaiDesktopInstallationMutation,
} from '../lib/galxe/galxe-client';
import { useAuth } from '../store/auth';
import { useSettings } from '../store/settings';

export const RegisterShinkaiDesktopInstallationFormSchema = z.object({
  address: z.string().min(42),
  signature: z.string().min(8),
  combined: z.string().min(8),
});
export type RegisterShinkaiDesktopInstallationForm = z.infer<
  typeof RegisterShinkaiDesktopInstallationFormSchema
>;

const SUBSCRIPTION_PATH = '/My Subscriptions';

export const GalxeSusbcriptions = () => {
  const { t } = useTranslation();
  const auth = useAuth((store) => store.auth);
  const evmAddress = useSettings((store) => store.evmAddress);
  const setEvmAddress = useSettings((store) => store.setEvmAddress);

  const { inboxes } = useGetInboxes({
    nodeAddress: auth?.node_address ?? '',
    token: auth?.api_v2_key ?? '',
  });

  const { data: subscriptionFolder } = useGetListDirectoryContents({
    nodeAddress: auth?.node_address ?? '',
    token: auth?.api_v2_key ?? '',
    path: SUBSCRIPTION_PATH,
  });

  const { data: subscriptions } = useGetMySubscriptions({
    nodeAddress: auth?.node_address ?? '',
    token: auth?.api_v2_key ?? '',
  });

  const filteredSubscriptions = subscriptions
    ?.map((subscription) => {
      const matchingFolder = subscriptionFolder?.find(
        (folder) =>
          folder.path.split('/')?.[2] ===
          subscription.shared_folder.replace(/^\/+/, ''),
      );

      return matchingFolder
        ? {
            ...subscription,
            folderPath: matchingFolder.path,
          }
        : null;
    })
    .filter((item) => !!item);

  const isUserSubscribedToKnowledge = (subscriptionFolder ?? [])?.length > 0;

  const inboxesWithSubscriptions: Inbox[] = inboxes.filter(
    (inbox) =>
      (inbox?.job_scope?.vector_fs_folders ?? []).some((folder) =>
        folder?.includes(SUBSCRIPTION_PATH),
      ) ||
      (inbox?.job_scope?.vector_fs_items ?? []).some((item) =>
        item?.includes(SUBSCRIPTION_PATH),
      ),
  );

  const hasUserAskedQuestionsSubscriptions =
    inboxesWithSubscriptions.length > 0;

  const { data: subscriptionsProof } = useGalxeGenerateProofQuery(
    auth?.node_signature_pk || '',
    JSON.stringify({
      subscriptions: filteredSubscriptions?.map((folder) => {
        return {
          identity: auth?.shinkai_identity,
          createdAt: folder.date_created,
          folder: folder.folderPath,
          inboxes: inboxesWithSubscriptions.map((inbox) => ({
            createdAt: inbox.datetime_created,
          })),
        };
      }),
    }),
    {
      enabled: isUserSubscribedToKnowledge,
    },
  );
  const form = useForm<RegisterShinkaiDesktopInstallationForm>({
    resolver: zodResolver(RegisterShinkaiDesktopInstallationFormSchema),
    defaultValues: {
      address: evmAddress,
      signature: subscriptionsProof?.[0],
      combined: subscriptionsProof?.[1],
    },
  });

  const { mutateAsync: validateQuest, isPending } =
    useGalxeRegisterShinkaiDesktopInstallationMutation({
      onSuccess: () => {
        toast.success('Your Quest has been updated');
      },
      onError: (error) => {
        toast.error('Error updating Quest', {
          description: error?.response?.data?.message ?? error.message,
        });
      },
    });

  const register = (values: RegisterShinkaiDesktopInstallationForm) => {
    validateQuest({ ...values });
  };

  const currentEvmAddress = useWatch({
    control: form.control,
    name: 'address',
  });

  useEffect(() => {
    if (currentEvmAddress) {
      setEvmAddress(currentEvmAddress);
    }
  }, [currentEvmAddress]);

  useEffect(() => {
    form.setValue('signature', subscriptionsProof?.[0] ?? '');
    form.setValue('combined', subscriptionsProof?.[1] ?? '');
  }, [subscriptionsProof, form]);

  return (
    <div className="flex grow flex-col space-y-4">
      <span className="text-gray-80 inline-flex items-center gap-1 px-1 py-2.5 hover:text-white">
        <a
          className={cn(
            buttonVariants({
              size: 'auto',
              variant: 'link',
            }),
            'rounded-lg p-0 text-xs text-inherit underline',
          )}
          href="https://app.galxe.com/quest/shinkai/GCfpWtkAN1"
          rel="noreferrer"
          target="_blank"
        >
          {t('galxe.goToGalxeQuest')}
        </a>
        <ExternalLinkIcon className="h-4 w-4" />
      </span>
      <div className="flex flex-col gap-3 rounded-lg border p-4 text-xs">
        <p>
          {isUserSubscribedToKnowledge ? (
            <>You can now validate Quest 🎉</>
          ) : (
            <>
              Make sure you have subscribed to Knowledge Sources and Ask
              Questions to validate Quest. You can do this by exploring the{' '}
              <Link className="underline" to="/public-subscriptions">
                Subscription Knowledge
              </Link>
              .
            </>
          )}
        </p>
        <div className="text-gray-50">
          <div className="flex items-center gap-2">
            {isUserSubscribedToKnowledge ? (
              <CheckCircledIcon className="text-green-400" />
            ) : (
              <CircleIcon className="text-green-400" />
            )}
            Subscribe to Knowledge Sources
          </div>

          <div className="flex items-center gap-2 pt-2">
            {hasUserAskedQuestionsSubscriptions ? (
              <CheckCircledIcon className="text-green-400" />
            ) : (
              <CircleIcon className="text-green-400" />
            )}
            Ask Questions to Subscription Knowledge
          </div>
        </div>
      </div>
      {isUserSubscribedToKnowledge ? (
        <Form {...form}>
          <form
            className="flex flex-col justify-between space-y-8"
            onSubmit={form.handleSubmit(register)}
          >
            <div className="flex grow flex-col space-y-5">
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <TextField
                    classes={{ input: 'font-mono' }}
                    endAdornment={
                      <div className="w-8">
                        <CopyToClipboardIcon
                          className="peer/adornment adornment absolute right-1 top-4 rounded-md border border-gray-200 bg-gray-300 px-2"
                          string={field.value}
                        />
                      </div>
                    }
                    field={{ ...field }}
                    helperMessage={t('galxe.form.evmAddressHelper')}
                    label={t('galxe.form.evmAddress')}
                  />
                )}
              />

              <FormField
                control={form.control}
                name="signature"
                render={({ field }) => (
                  <TextField
                    classes={{
                      input: 'font-mono',
                    }}
                    endAdornment={
                      <div className="w-8">
                        <CopyToClipboardIcon
                          className="peer/adornment adornment absolute right-1 top-4 rounded-md border border-gray-200 bg-gray-300 px-2"
                          string={field.value}
                        />
                      </div>
                    }
                    field={{ ...field, readOnly: true }}
                    label={t('galxe.form.signature')}
                  />
                )}
              />

              <FormField
                control={form.control}
                name="combined"
                render={({ field }) => (
                  <TextField
                    classes={{
                      input: 'font-mono',
                    }}
                    endAdornment={
                      <div className="w-8">
                        <CopyToClipboardIcon
                          className="peer/adornment adornment absolute right-1 top-4 rounded-md border border-gray-200 bg-gray-300 px-2"
                          string={field.value}
                        />
                      </div>
                    }
                    field={{ ...field, readOnly: true }}
                    label={t('galxe.form.proof')}
                  />
                )}
              />

              <Button
                className="w-full"
                disabled={isPending}
                isLoading={isPending}
                type="submit"
              >
                Validate
              </Button>
            </div>
          </form>
        </Form>
      ) : null}
    </div>
  );
};
