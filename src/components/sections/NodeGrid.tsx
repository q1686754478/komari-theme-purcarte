import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  formatBytes,
  formatUptime,
  getOSImage,
  formatTrafficLimit,
} from "@/utils";
import type { NodeData } from "@/types/node";
import { Link } from "react-router-dom";
import {
  CpuIcon,
  MemoryStickIcon,
  HardDriveIcon,
  Info,
} from "lucide-react";
import {
  FaArrowCircleDown,
  FaArrowCircleUp,
  FaClock,
  FaInfoCircle,
  FaRegArrowAltCircleDown,
  FaRegArrowAltCircleUp,
} from "react-icons/fa";
import "bootstrap-icons/font/bootstrap-icons.css";
import Flag from "./Flag";
import { Tag } from "../ui/tag";
import { useNodeCommons } from "@/hooks/useNodeCommons";
import { ProgressBar } from "../ui/progress-bar";
import { CircleProgress } from "../ui/progress-circle";
import { useAppConfig } from "@/config";
import { useLocale } from "@/config/hooks";
import { NodeDisplayContainer } from "./NodeDisplay";

interface NezhaProgressRowProps {
  label: string;
  value: number;
  offline: boolean;
  displayValue?: string;
}

const NezhaProgressRow = ({
  label,
  value,
  offline,
  displayValue,
}: NezhaProgressRowProps) => {
  const clampedValue = Math.max(0, Math.min(100, value));
  const level = offline
    ? "offline"
    : clampedValue < 51
    ? "normal"
    : clampedValue < 81
    ? "warning"
    : "error";

  return (
    <div className="nezha-reference-progress-row">
      <span className="nezha-reference-row-label">{label}</span>
      <div className="nezha-reference-progress" data-level={level}>
        <div
          className="nezha-reference-progress-fill"
          style={{ width: `${clampedValue}%` }}
        />
      </div>
      <span className="nezha-reference-progress-value">
        {displayValue ?? `${clampedValue.toFixed(0)}%`}
      </span>
    </div>
  );
};

interface NodeGridContainerProps {
  nodes: NodeData[];
  enableSwap: boolean;
  selectTrafficProgressStyle: "circular" | "linear";
}

export const NodeGridContainer = ({
  nodes,
  enableSwap,
  selectTrafficProgressStyle,
}: NodeGridContainerProps) => {
  return (
    <NodeDisplayContainer nodes={nodes}>
      {(node, onShowDetails) => (
        <NodeGrid
          key={node.uuid}
          node={node}
          enableSwap={enableSwap}
          selectTrafficProgressStyle={selectTrafficProgressStyle}
          onShowDetails={onShowDetails}
        />
      )}
    </NodeDisplayContainer>
  );
};

interface NodeGridProps {
  node: NodeData;
  enableSwap: boolean;
  selectTrafficProgressStyle: "circular" | "linear";
  onShowDetails: () => void;
}

export const NodeGrid = ({
  node,
  enableSwap,
  selectTrafficProgressStyle,
  onShowDetails,
}: NodeGridProps) => {
  const {
    stats,
    isOnline,
    tagList,
    cpuUsage,
    memUsage,
    swapUsage,
    diskUsage,
    load,
    expired_at,
    trafficPercentage,
  } = useNodeCommons(node);
  const { visualPreset, isShowHWBarInCard, isShowValueUnderProgressBar } =
    useAppConfig();
  const { t } = useLocale();

  if (visualPreset === "nezha") {
    return (
      <Card
        surface="card"
        data-online={isOnline ? "true" : "false"}
        className="nezha-reference-card flex w-full flex-col">
        <CardHeader className="nezha-reference-card-header flex flex-row items-center justify-between space-y-0">
          <Link
            to={`/instance/${node.uuid}`}
            className="nezha-reference-title-link min-w-0">
            <div className="nezha-reference-title-content flex min-w-0 items-center">
              <Flag flag={node.region} />
              <img
                src={getOSImage(node.os)}
                alt={node.os}
                className="nezha-reference-os-icon object-contain"
                loading="lazy"
              />
              <CardTitle className="nezha-reference-name truncate">
                {node.name}
                {!isOnline && (
                  <span className="nezha-reference-offline">[已离线]</span>
                )}
              </CardTitle>
            </div>
          </Link>
          <div className="nezha-reference-info-wrap">
            <button
              className="nezha-reference-info"
              onClick={onShowDetails}
              aria-label={t("node.details", { name: node.name })}>
              <FaInfoCircle />
            </button>
            <div className="nezha-reference-popup" role="tooltip">
              <div>
                系统: {node.os} [{node.virtualization || "-"}:{node.arch}]
              </div>
              <div>CPU: {node.cpu_name || t("node.notAvailable")}</div>
              <div>
                硬盘: {stats ? formatBytes(stats.disk) : "0 B"} / {formatBytes(node.disk_total)}
              </div>
              <div>
                内存: {stats ? formatBytes(stats.ram) : "0 B"} / {formatBytes(node.mem_total)}
              </div>
              <div>
                交换: {stats ? formatBytes(stats.swap) : "0 B"} / {formatBytes(node.swap_total)}
              </div>
              <div>
                流量: ↓ {stats ? formatBytes(stats.net_total_down) : "0 B"} ↑ {stats ? formatBytes(stats.net_total_up) : "0 B"}
              </div>
              <div>负载: {load}</div>
              <div>
                在线: {isOnline && stats ? formatUptime(stats.uptime) : t("node.offline")}
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="nezha-reference-card-content">
          <div className="nezha-reference-divider" />
          <NezhaProgressRow
            label="CPU"
            value={cpuUsage}
            offline={!isOnline}
          />
          <NezhaProgressRow
            label="内存"
            value={memUsage}
            offline={!isOnline}
          />
          {enableSwap && (
            <NezhaProgressRow
              label="交换"
              value={swapUsage}
              offline={!isOnline}
              displayValue={
                node.swap_total > 0 ? `${swapUsage.toFixed(0)}%` : "OFF"
              }
            />
          )}
          <NezhaProgressRow
            label="硬盘"
            value={diskUsage}
            offline={!isOnline}
          />

          <div className="nezha-reference-detail-row">
            <span className="nezha-reference-row-label">网速</span>
            <div className="nezha-reference-detail-value">
              <span className="nezha-reference-download">
                <FaRegArrowAltCircleDown />
                {stats && isOnline
                  ? formatBytes(stats.net_in, true)
                  : t("node.notAvailable")}
              </span>
              <span className="nezha-reference-upload">
                <FaRegArrowAltCircleUp />
                {stats && isOnline
                  ? formatBytes(stats.net_out, true)
                  : t("node.notAvailable")}
              </span>
            </div>
          </div>

          <div className="nezha-reference-detail-row">
            <span className="nezha-reference-row-label">{t("node.traffic")}</span>
            <div className="nezha-reference-detail-value">
              <span className="nezha-reference-traffic">
                <FaArrowCircleDown />
                {stats && isOnline
                  ? formatBytes(stats.net_total_down)
                  : t("node.notAvailable")}
              </span>
              <span className="nezha-reference-traffic">
                <FaArrowCircleUp />
                {stats && isOnline
                  ? formatBytes(stats.net_total_up)
                  : t("node.notAvailable")}
              </span>
            </div>
          </div>

          <div className="nezha-reference-detail-row">
            <span className="nezha-reference-row-label">信息</span>
            <div className="nezha-reference-detail-value nezha-reference-hardware">
              <span>
                <i aria-hidden="true" className="bi bi-cpu-fill" />
                {node.cpu_cores} {t("node.cores")}
              </span>
              <span>
                <i aria-hidden="true" className="bi bi-memory" />
                {formatBytes(node.mem_total)}
              </span>
              <span>
                <i aria-hidden="true" className="bi bi-hdd" />
                {formatBytes(node.disk_total)}
              </span>
            </div>
          </div>

          <div className="nezha-reference-detail-row">
            <span className="nezha-reference-row-label">负载</span>
            <div className="nezha-reference-detail-value nezha-reference-load">
              <i aria-hidden="true" className="bi bi-activity" />
              <span>{load}</span>
            </div>
          </div>

          <div className="nezha-reference-detail-row">
            <span className="nezha-reference-row-label">在线</span>
            <div className="nezha-reference-detail-value">
              <FaClock className="nezha-reference-clock" />
              <span>
                {isOnline && stats
                  ? formatUptime(stats.uptime)
                  : t("node.offline")}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      surface="card"
      data-online={isOnline ? "true" : "false"}
      className={`nezha-node-card flex flex-col mx-auto w-full max-w-sm ${
        isOnline
          ? ""
          : "striped-bg-red-translucent-diagonal ring-2 ring-red-500/50"
      }`}>
      <CardHeader className="nezha-node-card-header flex flex-row items-center justify-between space-y-0 pb-2">
        <Link
          to={`/instance/${node.uuid}`}
          className="nezha-node-title-link min-w-0 hover:underline hover:text-(--accent-11)">
          <div className="flex items-center gap-2">
            <Flag flag={node.region}></Flag>
            <img
              src={getOSImage(node.os)}
              alt={node.os}
              className="w-6 h-6 object-contain"
              loading="lazy"
            />
            <CardTitle className="nezha-node-name truncate text-base font-bold">
              {node.name}
              {!isOnline && (
                <span className="nezha-offline-label"> [Offline]</span>
              )}
            </CardTitle>
          </div>
        </Link>
        <button
          className="nezha-node-info"
          onClick={onShowDetails}
          aria-label={t("node.details", { name: node.name })}>
          <Info className="h-5 w-5" />
        </button>
      </CardHeader>
      <CardContent className="nezha-node-card-content flex-grow space-y-3 text-sm text-nowrap">
        <div className="nezha-node-tags flex flex-wrap gap-1 mb-2">
          <Tag tags={tagList} />
        </div>
        <div className="nezha-node-divider border-t border-(--accent-4)/50 my-2"></div>
        {isShowHWBarInCard && (
          <div className="nezha-hardware-row flex items-center justify-around whitespace-nowrap">
            <div className="flex items-center gap-1">
              <CpuIcon className="purcarte-icon-hardware size-4 text-blue-600 flex-shrink-0" />
              <span>
                {node.cpu_cores} {t("node.cores")}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <MemoryStickIcon className="purcarte-icon-hardware size-4 text-green-600 flex-shrink-0" />
              <span>{formatBytes(node.mem_total)}</span>
            </div>
            <div className="flex items-center gap-1">
              <HardDriveIcon className="purcarte-icon-hardware size-4 text-red-600 flex-shrink-0" />
              <span>{formatBytes(node.disk_total)}</span>
            </div>
          </div>
        )}
        <div className={`${isShowValueUnderProgressBar ? "mb-1" : ""}`}>
          <div className="flex items-center justify-between">
            <span>{t("node.cpu")}</span>
            <div className="w-3/4 flex items-center gap-2">
              <ProgressBar value={cpuUsage} offline={!isOnline} />
              <span className="w-12 text-right">{cpuUsage.toFixed(0)}%</span>
            </div>
          </div>
          {isShowValueUnderProgressBar && (
            <div className="flex text-xs items-center justify-between text-secondary-foreground">
              <span>
                {node.cpu_cores} {t("node.cores")}
              </span>
            </div>
          )}
        </div>
        <div className={`${isShowValueUnderProgressBar ? "mb-1" : ""}`}>
          <div className="flex items-center justify-between">
            <span>{t("node.mem")}</span>
            <div className="w-3/4 flex items-center gap-2">
              <ProgressBar value={memUsage} offline={!isOnline} />
              <span className="w-12 text-right">{memUsage.toFixed(0)}%</span>
            </div>
          </div>
          {isShowValueUnderProgressBar && (
            <div className="flex text-xs items-center justify-between text-secondary-foreground">
              <span>
                {node.mem_total > 0
                  ? `${formatBytes(node.mem_total)}`
                  : t("node.notAvailable")}
              </span>
              <span>
                {stats ? `${formatBytes(stats.ram)}` : t("node.notAvailable")}
              </span>
            </div>
          )}
        </div>
        {enableSwap && (
          <div className={`${isShowValueUnderProgressBar ? "mb-1" : ""}`}>
            <div className="flex items-center justify-between">
              <span>{t("node.swap")}</span>
              <div className="w-3/4 flex items-center gap-2">
                <ProgressBar value={swapUsage} offline={!isOnline} />
                {node.swap_total > 0 ? (
                  <span className="w-12 text-right">
                    {swapUsage.toFixed(0)}%
                  </span>
                ) : (
                  <span className="w-12 text-right">{t("node.off")}</span>
                )}
              </div>
            </div>
            {isShowValueUnderProgressBar && (
              <div className="flex text-xs items-center justify-between text-secondary-foreground">
                <span>
                  {node.swap_total > 0
                    ? `${formatBytes(node.swap_total)}`
                    : t("node.notEnabled")}
                </span>
                <span>
                  {stats
                    ? `${formatBytes(stats.swap)}`
                    : t("node.notAvailable")}
                </span>
              </div>
            )}
          </div>
        )}
        <div className={`${isShowValueUnderProgressBar ? "mb-1" : ""}`}>
          <div className="flex items-center justify-between">
            <span>{t("node.disk")}</span>
            <div className="w-3/4 flex items-center gap-2">
              <ProgressBar value={diskUsage} offline={!isOnline} />
              <span className="w-12 text-right">{diskUsage.toFixed(0)}%</span>
            </div>
          </div>
          {isShowValueUnderProgressBar && (
            <div className="flex text-xs items-center justify-between text-secondary-foreground">
              <span>
                {node.disk_total > 0
                  ? `${formatBytes(node.disk_total)}`
                  : t("node.notAvailable")}
              </span>
              <span>
                {stats ? `${formatBytes(stats.disk)}` : t("node.notAvailable")}
              </span>
            </div>
          )}
        </div>
        {selectTrafficProgressStyle === "linear" && (
          <div className="mb-1">
            <div className="flex items-center justify-between">
              <span>{t("node.traffic")}</span>
              <div className="w-3/4 flex items-center gap-2">
                <ProgressBar
                  value={trafficPercentage}
                  offline={!isOnline}
                />
                <span className="w-12 text-right">
                  {node.traffic_limit !== 0
                    ? `${trafficPercentage.toFixed(0)}%`
                    : t("node.off")}
                </span>
              </div>
            </div>
            <div className="flex text-xs items-center justify-between text-secondary-foreground">
              <span>
                {formatTrafficLimit(
                  node.traffic_limit,
                  node.traffic_limit_type
                )}
              </span>
              <span>
                {stats ? (
                  <>
                    <span className="purcarte-icon-upload">
                      {t("node.uploadPrefix")}
                    </span>{" "}
                    {formatBytes(stats.net_total_up)}{" "}
                    <span className="purcarte-icon-download">
                      {t("node.downloadPrefix")}
                    </span>{" "}
                    {formatBytes(stats.net_total_down)}
                  </>
                ) : (
                  t("node.notAvailable")
                )}
              </span>
            </div>
          </div>
        )}
        <div className="nezha-node-divider border-t border-(--accent-4)/50 my-2"></div>
        <div className="nezha-meta-row flex justify-between text-xs">
          <span>{t("node.network")}</span>
          <div>
            <span>
              <span className="purcarte-icon-upload">
                {t("node.uploadPrefix")}
              </span>{" "}
              {stats
                ? formatBytes(stats.net_out, true)
                : t("node.notAvailable")}
            </span>
            <span className="ml-2">
              <span className="purcarte-icon-download">
                {t("node.downloadPrefix")}
              </span>{" "}
              {stats ? formatBytes(stats.net_in, true) : t("node.notAvailable")}
            </span>
          </div>
        </div>
        {selectTrafficProgressStyle === "circular" && (
          <div className="nezha-meta-row flex items-center justify-between text-xs">
            <span className="w-1/5">{t("node.traffic")}</span>
            <div className="flex items-center justify-between w-4/5">
              <div className="flex items-center w-1/4">
                {node.traffic_limit !== 0 && (
                  <CircleProgress
                    value={trafficPercentage}
                    maxValue={100}
                    size={32}
                    strokeWidth={4}
                    showPercentage={true}
                  />
                )}
              </div>
              <div className="w-3/4 text-right">
                <div>
                  <span>
                    <span className="purcarte-icon-upload">
                      {t("node.uploadPrefix")}
                    </span>{" "}
                    {stats
                      ? formatBytes(stats.net_total_up)
                      : t("node.notAvailable")}
                  </span>
                  <span className="ml-2">
                    <span className="purcarte-icon-download">
                      {t("node.downloadPrefix")}
                    </span>{" "}
                    {stats
                      ? formatBytes(stats.net_total_down)
                      : t("node.notAvailable")}
                  </span>
                </div>
                {node.traffic_limit !== 0 && isOnline && stats && (
                  <div className="text-right">
                    {formatTrafficLimit(
                      node.traffic_limit,
                      node.traffic_limit_type
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        <div className="nezha-meta-row flex justify-between text-xs">
          <span>{t("node.load")}</span>
          <span>{load}</span>
        </div>
        <div className="nezha-meta-row flex justify-between text-xs">
          <div className="flex justify-start w-full">
            <span className="mr-1">{t("node.expiredAt")}</span>
            <span>{expired_at}</span>
          </div>
          <div className="border-l border-(--accent-4)/50 mx-2"></div>
          <div className="flex justify-end w-full">
            <span>
              {isOnline && stats ? (
                <>
                  <span className="mr-1">{t("node.uptime")}</span>
                  <span>{formatUptime(stats.uptime)}</span>
                </>
              ) : (
                t("node.offline")
              )}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
