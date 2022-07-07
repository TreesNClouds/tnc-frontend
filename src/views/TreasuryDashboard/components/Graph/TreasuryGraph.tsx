import { t } from "@lingui/macro";
import { Box, Grid, Link, Skeleton, SvgIcon, Tooltip, Typography } from "@mui/material";
import { DataGrid, GridColDef, GridComparatorFn, GridValueGetterParams } from "@mui/x-data-grid";
import { InfoTooltip } from "@olympusdao/component-library";
import { CSSProperties } from "react";
import { ReactComponent as GraphLogo } from "src/assets/icons/graph-grt-logo.svg";
import Chart, { DataFormat } from "src/components/Chart/Chart";
import { getSubgraphUrl } from "src/constants";
import {
  KeyMetricsDocument,
  MarketValueMetricsComponentsDocument,
  MarketValueMetricsDocument,
  ProtocolOwnedLiquidityComponentsDocument,
  useKeyMetricsQuery,
  useMarketValueMetricsComponentsQuery,
  useMarketValueMetricsQuery,
  useProtocolOwnedLiquidityComponentsQuery,
} from "src/generated/graphql";
import { formatCurrency } from "src/helpers";
import {
  getDataKeysFromTokens,
  getKeysTokenSummary,
  getTokensFromKey,
  reduceKeysTokenSummary,
} from "src/helpers/ProtocolMetricsHelper";

import { itemType, tooltipInfoMessages, tooltipItems } from "../../treasuryData";

// These constants are used by charts to have consistent colours
const defaultColors: string[] = ["#FFBF00", "#FF7F50", "#DE3163", "#9FE2BF", "#40E0D0", "#6495ED", "#CCCCFF"];
const defaultBulletpointColours: CSSProperties[] = defaultColors.map(value => {
  return {
    background: value,
  };
});
export const defaultRecordsCount = 90;

const getSubgraphQueryExplorerUrl = (queryDocument: string): string => {
  return `${getSubgraphUrl()}/graphql?query=${encodeURIComponent(queryDocument)}`;
};

type GraphProps = {
  count?: number;
};

/**
 * React Component that displays a line graph comparing the
 * OHM price and liquid backing per floating OHM.
 *
 * @returns
 */
export const LiquidBackingPerOhmComparisonGraph = ({ count = defaultRecordsCount }: GraphProps) => {
  const { data } = useKeyMetricsQuery({ endpoint: getSubgraphUrl() }, { records: count });
  const queryExplorerUrl = getSubgraphQueryExplorerUrl(KeyMetricsDocument);

  const itemNames = [t`OHM Price`, t`Liquid Backing per Floating OHM`];

  return (
    <Chart
      type="composed"
      data={data ? data.protocolMetrics : []}
      dataKey={["ohmPrice", "treasuryLiquidBackingPerOhmFloating"]}
      itemType={itemType.dollar}
      color={""}
      stopColor={[[]]}
      stroke={defaultColors}
      headerText={t`OHM Backing`}
      headerSubText={`${data && formatCurrency(data.protocolMetrics[0].treasuryLiquidBackingPerOhmFloating, 2)}`}
      dataFormat={DataFormat.Currency}
      bulletpointColors={defaultBulletpointColours}
      itemNames={itemNames}
      margin={{ left: 30 }}
      infoTooltipMessage={tooltipInfoMessages().backingPerOhm}
      expandedGraphStrokeColor={""}
      isPOL={false}
      isStaked={false}
      itemDecimals={2}
      subgraphQueryUrl={queryExplorerUrl}
    />
  );
};

export const MarketValueGraph = ({ count = defaultRecordsCount }: GraphProps) => {
  const { data } = useMarketValueMetricsQuery({ endpoint: getSubgraphUrl() }, { records: count });
  const queryExplorerUrl = getSubgraphQueryExplorerUrl(MarketValueMetricsDocument);

  return (
    <Chart
      type="stack"
      data={data ? data.protocolMetrics : []}
      dataKey={["treasuryStableValue", "treasuryVolatileValue", "treasuryLPValue"]}
      color={""}
      stopColor={[[]]}
      stroke={defaultColors}
      dataFormat={DataFormat.Currency}
      headerText={t`Market Value of Treasury Assets`}
      headerSubText={`${data && formatCurrency(data.protocolMetrics[0].treasuryMarketValue)}`}
      bulletpointColors={defaultBulletpointColours}
      itemNames={tooltipItems.marketValueComponents}
      itemType={itemType.dollar}
      infoTooltipMessage={tooltipInfoMessages().mvt}
      expandedGraphStrokeColor={""}
      isPOL={false}
      isStaked={false}
      itemDecimals={0}
      subgraphQueryUrl={queryExplorerUrl}
    />
  );
};

export const ProtocolOwnedLiquidityGraph = ({ count = defaultRecordsCount }: GraphProps) => {
  const { data } = useProtocolOwnedLiquidityComponentsQuery({ endpoint: getSubgraphUrl() }, { records: count });
  const queryExplorerUrl = getSubgraphQueryExplorerUrl(ProtocolOwnedLiquidityComponentsDocument);

  const tokenSummary = getKeysTokenSummary(
    data?.protocolMetrics,
    ["treasuryLPValueComponents"],
    ["Protocol-Owned Liquidity"],
  );

  const tokenCategories = getTokensFromKey(tokenSummary, "treasuryLPValueComponents");
  const dataKeys = getDataKeysFromTokens(tokenCategories, "treasuryLPValueComponents");

  return (
    <Chart
      type="stack"
      data={tokenSummary}
      dataKey={dataKeys}
      color={""}
      stopColor={[[]]}
      stroke={defaultColors}
      dataFormat={DataFormat.Currency}
      headerText={t`Protocol-Owned Liquidity`}
      headerSubText={`${data && formatCurrency(data.protocolMetrics[0].treasuryLPValueComponents.value, 0)}`}
      bulletpointColors={defaultBulletpointColours}
      itemNames={tokenCategories}
      itemType={itemType.dollar}
      infoTooltipMessage={tooltipInfoMessages().mvt}
      expandedGraphStrokeColor={""}
      isPOL={false}
      isStaked={false}
      itemDecimals={0}
      subgraphQueryUrl={queryExplorerUrl}
    />
  );
};

export const AssetsTable = () => {
  const { data } = useMarketValueMetricsComponentsQuery({ endpoint: getSubgraphUrl() });
  const queryExplorerUrl = getSubgraphQueryExplorerUrl(MarketValueMetricsComponentsDocument);

  if (!data) return <Skeleton />;

  const keys = ["treasuryStableValueComponents", "treasuryVolatileValueComponents", "treasuryLPValueComponents"];
  const tokenSummary = getKeysTokenSummary(data?.protocolMetrics, keys, [
    "Stablecoins",
    "Volatile",
    "Protocol-Owned Liquidity",
  ]);
  const reducedTokens = reduceKeysTokenSummary(tokenSummary, keys);
  const currentMetric = reducedTokens[0];

  const currencySortComparator: GridComparatorFn<string> = (v1, v2) => {
    // Get rid of all non-number characters
    const stripCurrency = (currencyString: string) => currencyString.replaceAll(/[$,]/g, "");

    return parseFloat(stripCurrency(v1)) - parseFloat(stripCurrency(v2));
  };

  // TODO look at caching
  // TODO handle date scrubbing

  const columns: GridColDef[] = [
    { field: "token", headerName: "Asset", flex: 1 },
    { field: "category", headerName: "Category", flex: 1 },
    {
      field: "value",
      headerName: "Value",
      flex: 1,
      type: "string",
      sortComparator: currencySortComparator,
      valueGetter: (params: GridValueGetterParams) => formatCurrency(parseFloat(params.row.value)),
    },
  ];

  const headerText = "Holdings";

  return (
    <Box style={{ width: "100%", height: "100%" }}>
      <div className="chart-card-header">
        <Box
          display="flex"
          justifyContent="space-between"
          alignItems="center"
          style={{ width: "100%", overflow: "hidden" }}
        >
          <Box display="flex" width="90%" alignItems="center">
            <Typography
              variant="h6"
              color="textSecondary"
              className="card-title-text"
              style={{ fontWeight: 400, overflow: "hidden" }}
            >
              {headerText}
            </Typography>
            <Typography variant={"h6"} color="textSecondary">
              <InfoTooltip
                message={t`This table lists the details of the treasury assets that make up the market value`}
              />
            </Typography>
          </Box>
          {/* could make this svgbutton */}

          <Grid item>
            <Grid container spacing={1}>
              <Grid item>
                {queryExplorerUrl && (
                  <Link href={queryExplorerUrl} target="_blank" rel="noopener noreferrer">
                    <Tooltip title={t`Open Subgraph Query`}>
                      <SvgIcon component={GraphLogo} viewBox="0 0 100 100" style={{ width: "16px", height: "16px" }} />
                    </Tooltip>
                  </Link>
                )}
              </Grid>
            </Grid>
          </Grid>
        </Box>{" "}
      </div>
      <div style={{ height: 400, width: "100%" }}>
        <DataGrid
          rows={currentMetric.tokens}
          rowHeight={40}
          columns={columns}
          pageSize={10}
          getRowId={row => row.token}
          // Sort by value descending
          initialState={{
            sorting: {
              sortModel: [{ field: "value", sort: "desc" }],
            },
          }}
          // Only ascending or descending sort
          sortingOrder={["desc", "asc"]}
          sx={{
            "& .MuiDataGrid-columnHeaders": {
              fontSize: "16px",
              height: "40px",
            },
            "& .MuiDataGrid-columnHeaderTitle": {
              fontWeight: 800,
            },
            "& .MuiDataGrid-cellContent": {
              fontSize: "14px",
            },
          }}
        />
        ;
      </div>
    </Box>
  );
};
