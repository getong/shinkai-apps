import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from '@shinkai_network/shinkai-i18n';
import {
  extractJobIdFromInbox,
  extractReceiverShinkaiName,
  isJobInbox,
} from '@shinkai_network/shinkai-message-ts/utils';
import { ShinkaiMessageBuilderWrapper } from '@shinkai_network/shinkai-message-ts/wasm/ShinkaiMessageBuilderWrapper';
import {
  ChatMessageFormSchemaWithOneFile,
  chatMessageFormSchemaWithOneFile,
} from '@shinkai_network/shinkai-node-state/forms/chat/chat-message';
import { FunctionKey } from '@shinkai_network/shinkai-node-state/lib/constants';
import { useSendMessageToJob } from '@shinkai_network/shinkai-node-state/lib/mutations/sendMessageToJob/useSendMessageToJob';
import { useSendMessageToInbox } from '@shinkai_network/shinkai-node-state/lib/mutations/sendMesssageToInbox/useSendMessageToInbox';
import { useSendMessageWithFilesToInbox } from '@shinkai_network/shinkai-node-state/lib/mutations/sendMesssageWithFilesToInbox/useSendMessageWithFilesToInbox';
import { useUpdateAgentInJob } from '@shinkai_network/shinkai-node-state/lib/mutations/updateAgentInJob/useUpdateAgentInJob';
import { Models } from '@shinkai_network/shinkai-node-state/lib/utils/models';
import { useGetChatConversationWithPagination } from '@shinkai_network/shinkai-node-state/v2/queries/getChatConversation/useGetChatConversationWithPagination';
import { useGetLLMProviders } from '@shinkai_network/shinkai-node-state/v2/queries/getLLMProviders/useGetLLMProviders';
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  ChatInputArea,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  MessageList,
  Tooltip,
  TooltipContent,
  TooltipPortal,
  TooltipProvider,
  TooltipTrigger,
} from '@shinkai_network/shinkai-ui';
import { fileIconMap, FileTypeIcon } from '@shinkai_network/shinkai-ui/assets';
import { getFileExt } from '@shinkai_network/shinkai-ui/helpers';
import { cn } from '@shinkai_network/shinkai-ui/utils';
import { useQueryClient } from '@tanstack/react-query';
import { partial } from 'filesize';
import {
  BotIcon,
  ChevronDownIcon,
  Paperclip,
  SendIcon,
  Terminal,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { useForm } from 'react-hook-form';
import { useParams } from 'react-router-dom';
import useWebSocket from 'react-use-websocket';
import { toast } from 'sonner';

import { useGetCurrentInbox } from '../../hooks/use-current-inbox';
import { useAuth } from '../../store/auth/auth';

function AgentSelection() {
  const { t } = useTranslation();
  const auth = useAuth((state) => state.auth);
  const currentInbox = useGetCurrentInbox();
  const { llmProviders } = useGetLLMProviders({
    nodeAddress: auth?.node_address ?? '',
    token: auth?.api_v2_key ?? '',
  });

  const { mutateAsync: updateAgentInJob } = useUpdateAgentInJob({
    onError: (error) => {
      toast.error(t('llmProviders.errors.updateAgent'), {
        description: error.message,
      });
    },
  });

  return (
    <DropdownMenu>
      <TooltipProvider delayDuration={0}>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger className="bg-gray-350 inline-flex cursor-pointer items-center justify-between gap-1 truncate rounded-xl px-2.5 py-1.5 text-start text-xs font-normal text-gray-50 hover:text-white [&[data-state=open]>.icon]:rotate-180">
              <BotIcon className="mr-1 h-4 w-4" />
              <span>{currentInbox?.agent?.id}</span>
              <ChevronDownIcon className="icon h-3 w-3" />
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipPortal>
            <TooltipContent
              align="center"
              className="bg-neutral-900"
              side="top"
            >
              {t('llmProviders.switch')}
            </TooltipContent>
          </TooltipPortal>
          <DropdownMenuContent
            align="start"
            className="max-h-[300px] min-w-[220px] overflow-y-auto bg-gray-300 p-1 py-2"
            side="top"
          >
            <DropdownMenuRadioGroup
              onValueChange={async (value) => {
                const jobId = extractJobIdFromInbox(
                  currentInbox?.inbox_id ?? '',
                );
                await updateAgentInJob({
                  nodeAddress: auth?.node_address ?? '',
                  shinkaiIdentity: auth?.shinkai_identity ?? '',
                  profile: auth?.profile ?? '',
                  jobId: jobId,
                  newAgentId: value,
                  my_device_encryption_sk: auth?.profile_encryption_sk ?? '',
                  my_device_identity_sk: auth?.profile_identity_sk ?? '',
                  node_encryption_pk: auth?.node_encryption_pk ?? '',
                  profile_encryption_sk: auth?.profile_encryption_sk ?? '',
                  profile_identity_sk: auth?.profile_identity_sk ?? '',
                });
              }}
              value={currentInbox?.agent?.id ?? ''}
            >
              {llmProviders.map((agent) => (
                <DropdownMenuRadioItem
                  className="flex cursor-pointer items-center gap-1.5 rounded-md px-2 py-2 text-white transition-colors hover:bg-gray-200 aria-checked:bg-gray-200"
                  key={agent.id}
                  value={agent.id}
                >
                  <BotIcon className="h-3.5 w-3.5" />
                  <div className="flex flex-col gap-1">
                    <span className="text-xs">{agent.id}</span>
                    {/*<span className="text-gray-80 text-xs">{agent.model}</span>*/}
                  </div>
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </Tooltip>
      </TooltipProvider>
    </DropdownMenu>
  );
}
type UseWebSocketMessage = {
  enabled?: boolean;
};
const useWebSocketMessage = ({ enabled }: UseWebSocketMessage) => {
  const auth = useAuth((state) => state.auth);
  const nodeAddressUrl = new URL(auth?.node_address ?? 'http://localhost:9850');
  const socketUrl = `ws://${nodeAddressUrl.hostname}:${Number(nodeAddressUrl.port) + 1}/ws`;
  const queryClient = useQueryClient();
  const { sendMessage, lastMessage, readyState } = useWebSocket(
    socketUrl,
    {
      share: true,
    },
    enabled,
  );
  const { inboxId: encodedInboxId = '' } = useParams();
  const inboxId = decodeURIComponent(encodedInboxId);
  const [messageContent, setMessageContent] = useState('');
  useEffect(() => {
    if (!enabled) return;
    if (lastMessage?.data) {
      try {
        const parseData: {
          message_type: 'Stream' | 'ShinkaiMessage';
          inbox: string;
          message: string;
          error_message: string;
          metadata?: {
            id: string;
            is_done: boolean;
            done_reason: string;
            total_duration: number;
            eval_count: number;
          };
        } = JSON.parse(lastMessage.data);
        if (parseData.message_type !== 'Stream') return;
        if (parseData.metadata?.is_done) {
          const paginationKey = [
            FunctionKey.GET_CHAT_CONVERSATION_PAGINATION,
            {
              nodeAddress: auth?.node_address ?? '',
              inboxId: inboxId as string,
              shinkaiIdentity: auth?.shinkai_identity ?? '',
              profile: auth?.profile ?? '',
              my_device_encryption_sk: auth?.my_device_encryption_sk ?? '',
              my_device_identity_sk: auth?.my_device_identity_sk ?? '',
              node_encryption_pk: auth?.node_encryption_pk ?? '',
              profile_encryption_sk: auth?.profile_encryption_sk ?? '',
              profile_identity_sk: auth?.profile_identity_sk ?? '',
            },
          ];
          queryClient.invalidateQueries({ queryKey: paginationKey });
        }

        setMessageContent((prev) => prev + parseData.message);
        return;
      } catch (error) {
        console.error('Failed to parse ws message', error);
      }
    }
  }, [
    auth?.my_device_encryption_sk,
    auth?.my_device_identity_sk,
    auth?.node_address,
    auth?.node_encryption_pk,
    auth?.profile,
    auth?.profile_encryption_sk,
    auth?.profile_identity_sk,
    auth?.shinkai_identity,
    enabled,
    inboxId,
    lastMessage?.data,
    queryClient,
  ]);

  useEffect(() => {
    if (!enabled) return;
    const wsMessage = {
      subscriptions: [{ topic: 'inbox', subtopic: inboxId }],
      unsubscriptions: [],
    };
    const wsMessageString = JSON.stringify(wsMessage);
    const shinkaiMessage = ShinkaiMessageBuilderWrapper.ws_connection(
      wsMessageString,
      auth?.profile_encryption_sk ?? '',
      auth?.profile_identity_sk ?? '',
      auth?.node_encryption_pk ?? '',
      auth?.shinkai_identity ?? '',
      auth?.profile ?? '',
      '',
      '',
    );
    sendMessage(shinkaiMessage);
  }, [
    auth?.node_encryption_pk,
    auth?.profile,
    auth?.profile_encryption_sk,
    auth?.profile_identity_sk,
    auth?.shinkai_identity,
    enabled,
    inboxId,
    sendMessage,
  ]);

  return { messageContent, readyState, setMessageContent };
};

export const Inbox = () => {
  const size = partial({ standard: 'jedec' });
  const { t } = useTranslation();
  const { inboxId: encodedInboxId = '' } = useParams<{ inboxId: string }>();
  const auth = useAuth((state) => state.auth);
  const inboxId = decodeURIComponent(encodedInboxId);

  const chatForm = useForm<ChatMessageFormSchemaWithOneFile>({
    resolver: zodResolver(chatMessageFormSchemaWithOneFile),
    defaultValues: {
      message: '',
    },
  });

  const { getRootProps: getRootFileProps, getInputProps: getInputFileProps } =
    useDropzone({
      multiple: false,
      onDrop: (acceptedFiles) => {
        const file = acceptedFiles[0];
        chatForm.setValue('file', file, { shouldValidate: true });
      },
    });

  const { file } = chatForm.watch();

  const currentInbox = useGetCurrentInbox();
  const isOllamaProvider =
    currentInbox?.agent?.model.split(':')?.[0] === Models.Ollama;

  const {
    data,
    fetchPreviousPage,
    hasPreviousPage,
    isPending: isChatConversationLoading,
    isFetchingPreviousPage,
    isSuccess: isChatConversationSuccess,
  } = useGetChatConversationWithPagination({
    nodeAddress: auth?.node_address ?? '',
    token: auth?.api_v2_key ?? '',
    inboxId: decodeURIComponent(inboxId ?? '') as string,
    shinkaiIdentity: auth?.shinkai_identity ?? '',
    profile: auth?.profile ?? '',
    refetchIntervalEnabled: !isOllamaProvider,
  });

  const { messageContent, setMessageContent } = useWebSocketMessage({
    enabled: isOllamaProvider,
  });

  const { mutateAsync: sendMessageToInbox } = useSendMessageToInbox();
  const { mutateAsync: sendMessageToJob } = useSendMessageToJob();
  const { mutateAsync: sendTextMessageWithFilesForInbox } =
    useSendMessageWithFilesToInbox();

  const fromPreviousMessagesRef = useRef<boolean>(false);
  const [isJobProcessingFile, setIsJobProcessingFile] =
    useState<boolean>(false);

  const regenerateMessage = async (content: string, parentHash: string) => {
    setMessageContent(''); // trick to clear the ws stream message
    if (!auth) return;
    const decodedInboxId = decodeURIComponent(inboxId);
    const jobId = extractJobIdFromInbox(decodedInboxId);
    await sendMessageToJob({
      nodeAddress: auth.node_address,
      jobId,
      message: content,
      files_inbox: '',
      parent: parentHash,
      shinkaiIdentity: auth.shinkai_identity,
      profile: auth.profile,
      my_device_encryption_sk: auth.my_device_encryption_sk,
      my_device_identity_sk: auth.my_device_identity_sk,
      node_encryption_pk: auth.node_encryption_pk,
      profile_encryption_sk: auth.profile_encryption_sk,
      profile_identity_sk: auth.profile_identity_sk,
    });
  };

  const onSubmit = async (data: ChatMessageFormSchemaWithOneFile) => {
    setMessageContent(''); // trick to clear the ws stream message
    if (!auth || data.message.trim() === '') return;
    fromPreviousMessagesRef.current = false;

    if (data.file) {
      await sendTextMessageWithFilesForInbox({
        nodeAddress: auth?.node_address ?? '',
        sender: auth.shinkai_identity,
        senderSubidentity: auth.profile,
        receiver: auth.shinkai_identity,
        message: data.message,
        inboxId: inboxId,
        files: [file],
        my_device_encryption_sk: auth.my_device_encryption_sk,
        my_device_identity_sk: auth.my_device_identity_sk,
        node_encryption_pk: auth.node_encryption_pk,
        profile_encryption_sk: auth.profile_encryption_sk,
        profile_identity_sk: auth.profile_identity_sk,
      });
      chatForm.reset();
      return;
    }

    if (isJobInbox(inboxId)) {
      const jobId = extractJobIdFromInbox(inboxId);
      await sendMessageToJob({
        nodeAddress: auth.node_address,
        jobId: jobId,
        message: data.message,
        files_inbox: '',
        parent: '', // Note: we should set the parent if we want to retry or branch out
        shinkaiIdentity: auth.shinkai_identity,
        profile: auth.profile,
        my_device_encryption_sk: auth.my_device_encryption_sk,
        my_device_identity_sk: auth.my_device_identity_sk,
        node_encryption_pk: auth.node_encryption_pk,
        profile_encryption_sk: auth.profile_encryption_sk,
        profile_identity_sk: auth.profile_identity_sk,
      });
    } else {
      const sender = `${auth.shinkai_identity}/${auth.profile}/device/${auth.registration_name}`;
      const receiver = extractReceiverShinkaiName(inboxId, sender);
      await sendMessageToInbox({
        nodeAddress: auth?.node_address ?? '',
        sender: auth.shinkai_identity,
        sender_subidentity: `${auth.profile}/device/${auth.registration_name}`,
        receiver,
        message: data.message,
        inboxId: inboxId,
        my_device_encryption_sk: auth.my_device_encryption_sk,
        my_device_identity_sk: auth.my_device_identity_sk,
        node_encryption_pk: auth.node_encryption_pk,
        profile_encryption_sk: auth.profile_encryption_sk,
        profile_identity_sk: auth.profile_identity_sk,
      });
    }
    chatForm.reset();
    setTimeout(() => {
      chatForm.setFocus('message');
    }, 200);
  };

  const isLoadingMessage = useMemo(() => {
    const lastMessage = data?.pages?.at(-1)?.at(-1);
    return (
      !!inboxId &&
      lastMessage?.role === 'assistant' &&
      lastMessage?.status.type === 'running'
    );
  }, [data?.pages, inboxId]);

  useEffect(() => {
    const lastMessage = data?.pages?.at(-1)?.at(-1);
    if (lastMessage) {
      setIsJobProcessingFile(
        isLoadingMessage &&
          lastMessage.role === 'user' &&
          !!lastMessage.attachments.length,
      );
    }
  }, [data?.pages, auth, isLoadingMessage]);

  return (
    <div className="flex h-full flex-col justify-between gap-3">
      <MessageList
        containerClassName="pr-4"
        editAndRegenerateMessage={regenerateMessage}
        fetchPreviousPage={fetchPreviousPage}
        hasPreviousPage={hasPreviousPage}
        isFetchingPreviousPage={isFetchingPreviousPage}
        isLoading={isChatConversationLoading}
        isSuccess={isChatConversationSuccess}
        lastMessageContent={messageContent}
        noMoreMessageLabel={t('chat.allMessagesLoaded')}
        paginatedMessages={data}
      />
      {isJobProcessingFile && (
        <Alert className="shadow-lg">
          <Terminal className="h-4 w-4" />
          <AlertTitle className="text-sm">
            {t('chat.fileProcessing.title')}
          </AlertTitle>
          <AlertDescription className="text-xs">
            <div className="flex flex-row items-center space-x-2">
              <span>{t('chat.fileProcessing.description')}</span>
            </div>
          </AlertDescription>
          <Terminal className="h-4 w-4" />
        </Alert>
      )}

      <div className="flex flex-col justify-start">
        <div className="relative flex items-start gap-2 pb-3">
          <Form {...chatForm}>
            <FormField
              control={chatForm.control}
              name="message"
              render={({ field }) => (
                <FormItem className="flex-1 space-y-0">
                  <FormLabel className="sr-only">
                    {t('chat.enterMessage')}
                  </FormLabel>
                  <FormControl>
                    <div className="">
                      <div className="flex items-center gap-2.5 px-1 pb-2 pt-1">
                        <AgentSelection />
                        <TooltipProvider delayDuration={0}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div
                                {...getRootFileProps({
                                  className: cn(
                                    'hover:bg-gray-350 relative flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-full rounded-lg p-1.5 text-white',
                                  ),
                                })}
                              >
                                <Paperclip className="h-full w-full" />
                                <input
                                  {...chatForm.register('file')}
                                  {...getInputFileProps({
                                    onChange:
                                      chatForm.register('file').onChange,
                                  })}
                                  className="sr-only"
                                />
                              </div>
                            </TooltipTrigger>
                            <TooltipPortal>
                              <TooltipContent
                                align="center"
                                className="bg-neutral-900"
                                side="top"
                              >
                                {t('common.uploadFile')}
                              </TooltipContent>
                            </TooltipPortal>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <ChatInputArea
                        bottomAddons={
                          <Button
                            className="h-[40px] w-[40px] self-end rounded-xl p-3"
                            disabled={isLoadingMessage}
                            isLoading={isLoadingMessage}
                            onClick={chatForm.handleSubmit(onSubmit)}
                            size="icon"
                            variant="tertiary"
                          >
                            <SendIcon className="h-full w-full" />
                            <span className="sr-only">
                              {t('chat.sendMessage')}
                            </span>
                          </Button>
                        }
                        disabled={isLoadingMessage}
                        onChange={field.onChange}
                        onSubmit={chatForm.handleSubmit(onSubmit)}
                        topAddons={
                          file && (
                            <div className="relative mt-1 flex min-w-[180px] max-w-[220px] items-center gap-2 self-start rounded-lg border border-gray-200 px-2 py-2.5">
                              {getFileExt(file?.name) &&
                              fileIconMap[getFileExt(file?.name)] ? (
                                <FileTypeIcon
                                  className="text-gray-80 h-7 w-7 shrink-0"
                                  type={getFileExt(file?.name)}
                                />
                              ) : (
                                <Paperclip className="text-gray-80 h-4 w-4 shrink-0" />
                              )}
                              <div className="space-y-1">
                                <span className="line-clamp-1 break-all text-left text-xs">
                                  {file?.name}
                                </span>
                                <span className="line-clamp-1 break-all text-left text-xs text-gray-100">
                                  {size(file?.size)}
                                </span>
                              </div>
                              <button
                                className={cn(
                                  'absolute -right-2 -top-2 h-5 w-5 cursor-pointer rounded-full bg-gray-500 p-1 text-gray-100 hover:text-white',
                                )}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  chatForm.setValue('file', undefined, {
                                    shouldValidate: true,
                                  });
                                }}
                              >
                                <X className="h-full w-full" />
                              </button>
                            </div>
                          )
                        }
                        value={field.value}
                      />
                    </div>
                  </FormControl>
                </FormItem>
              )}
            />
          </Form>
        </div>
      </div>
    </div>
  );
};
