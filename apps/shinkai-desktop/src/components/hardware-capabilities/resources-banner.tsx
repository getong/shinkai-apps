import {
  Alert,
  AlertDescription,
  AlertTitle,
  Tooltip,
  TooltipContent,
  TooltipPortal,
  TooltipProvider,
  TooltipTrigger,
} from '@shinkai_network/shinkai-ui';
import { cn } from '@shinkai_network/shinkai-ui/utils';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, XIcon } from 'lucide-react';

import {
  RequirementsStatus,
  useHardwareGetSummaryQuery,
} from '../../lib/hardware.ts/hardware-client';
import { showAnimation } from '../../pages/layout/main-layout';
import { useSettings } from '../../store/settings';

export const ResourcesBanner = ({
  className,
  isInSidebar,
}: {
  className?: string;
  isInSidebar?: boolean;
}) => {
  const { isSuccess, data: hardwareSummary } = useHardwareGetSummaryQuery();
  const sidebarExpanded = useSettings((state) => state.sidebarExpanded);
  const compatibilityBannerDismissed = useSettings(
    (state) => state.compatibilityBannerDismissed,
  );
  const setCompatibilityBannerDismissed = useSettings(
    (state) => state.setCompatibilityBannerDismissed,
  );

  const isOptimal =
    hardwareSummary?.requirements_status === RequirementsStatus.Optimal;
  const lessThanMinimum =
    hardwareSummary?.requirements_status === RequirementsStatus.Unmeet ||
    hardwareSummary?.requirements_status === RequirementsStatus.StillUsable;
  const lessThanRecomendded =
    hardwareSummary?.requirements_status === RequirementsStatus.Unmeet ||
    hardwareSummary?.requirements_status === RequirementsStatus.StillUsable ||
    hardwareSummary?.requirements_status === RequirementsStatus.Minimum;

  const alertContent = (
    <Alert className="relative shadow-lg" variant="warning">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle className="text-sm font-medium">
        Device Compatibility
      </AlertTitle>
      <AlertDescription className="text-xs">
        <div className="flex flex-col gap-2">
          <div>AI models could not work or run really slow.</div>

          <div className="ml-2 flex list-disc flex-col space-y-1">
            {lessThanMinimum ? (
              <span>
                - Your computer doesn&apos;t meet the minimum requirements:{' '}
                {hardwareSummary?.requirements.minimum.cpus} CPUs and{' '}
                {hardwareSummary?.requirements.minimum.memory}GB RAM.
              </span>
            ) : (
              lessThanRecomendded && (
                <span>
                  - Your computer doesn&apos;t meet the recommended
                  requirements: {hardwareSummary?.requirements.recommended.cpus}{' '}
                  CPUs and {hardwareSummary?.requirements.recommended.memory}GB
                  RAM.
                </span>
              )
            )}

            {!hardwareSummary?.hardware.discrete_gpu && (
              <span>- Your computer doesn&apos;t have a discrete GPU.</span>
            )}
          </div>
          {/* In Coinlist Testnet 2, We disabled Shinkai Hosting so we can skip this message until we enable it again */}
          {/* <div className="mt-2">
            <span aria-label="lightbulb" role="img">
              💡
            </span>{' '}
            We recommend to use{' '}
            <TextLink
              className="text-yellow-200"
              label={'Shinkai Hosting'}
              url={'https://www.shinkai.com/get-shinkai'}
            />
          </div> */}
        </div>
      </AlertDescription>
      <button
        className="absolute right-2 top-2 z-[100] text-gray-500 hover:text-gray-700"
        onClick={() => setCompatibilityBannerDismissed(true)}
        type="button"
      >
        <XIcon className="h-4 w-4 text-yellow-200" />
      </button>
    </Alert>
  );
  if (isInSidebar && !isOptimal && !compatibilityBannerDismissed) {
    return (
      <div className={cn('flex w-full flex-col text-xs', className)}>
        <TooltipProvider delayDuration={0}>
          <Tooltip>
            <TooltipTrigger className="flex items-center gap-1">
              <Alert
                className={cn(
                  'cursor-default shadow-lg [&>svg]:static [&>svg~*]:pl-0',
                  'flex w-full items-center gap-2 rounded-lg px-4 py-2',
                )}
                variant="warning"
              >
                <AlertTriangle className="h-5 w-5 shrink-0" />
                <AnimatePresence>
                  {sidebarExpanded && (
                    <motion.span
                      animate="show"
                      className="whitespace-nowrap text-xs"
                      exit="hidden"
                      initial="hidden"
                      variants={showAnimation}
                    >
                      Device Compatibility
                    </motion.span>
                  )}
                </AnimatePresence>
              </Alert>
            </TooltipTrigger>
            <TooltipPortal>
              <TooltipContent
                align="center"
                arrowPadding={2}
                className="max-w-md p-0"
                side="right"
              >
                {alertContent}
              </TooltipContent>
            </TooltipPortal>
          </Tooltip>
        </TooltipProvider>
      </div>
    );
  }

  if (compatibilityBannerDismissed) {
    return null;
  }

  return (
    <div className={cn('flex w-full flex-col text-xs', className)}>
      {isSuccess && !isOptimal && alertContent}
    </div>
  );
};
