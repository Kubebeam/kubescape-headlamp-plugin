/* 
  Show container image scans. This view is part of the main Vulnerabilities page.  
*/
import {
  DateLabel,
  Link as HeadlampLink,
  SectionBox,
  Table as HeadlampTable,
} from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import { Box, Stack, Tooltip } from '@mui/material';
import { RoutingPath } from '../index';
import { ImageScan, WorkloadScan } from './fetch-vulnerabilities';

export default function ImageListView(props: { workloadScans: WorkloadScan[] }) {
  const { workloadScans } = props;
  if (!workloadScans) {
    return <></>;
  }

  const imageScans = getImageScans(workloadScans);

  return (
    <>
      <h5>{imageScans.length} image scans</h5>
      <SectionBox>
        <HeadlampTable
          data={imageScans}
          columns={[
            {
              header: 'Image',
              accessorKey: 'manifestName',
              Cell: ({ cell }: any) => {
                return (
                  <HeadlampLink
                    routeName={RoutingPath.ImageVulnerabilityDetails}
                    params={{
                      name: cell.getValue(),
                    }}
                  >
                    {cell.getValue().split('@sha')[0]}
                  </HeadlampLink>
                );
              },
              gridTemplate: 'max-content',
            },
            {
              header: 'Workload',
              accessorFn: (imageScan: ImageScan) => {
                const workloads = workloadScans
                  .filter(scan => scan.imageScan?.manifestName === imageScan.manifestName)
                  .map(scan => scan.container);

                const uniqueWorkloads = [...new Set(workloads)];
                return <div style={{ whiteSpace: 'pre-line' }}>{uniqueWorkloads.join('\n')}</div>;
              },
              gridTemplate: 'max-content',
            },
            {
              header: 'Last scan',
              accessorFn: (imageScan: ImageScan) => (
                <DateLabel date={imageScan.creationTimestamp} />
              ),
              gridTemplate: 'max-content',
            },
            {
              header: 'Vulnerabilities',
              accessorFn: (imageScan: ImageScan) => resultStack(imageScan),
            },
            {
              header: 'SBOM',
              accessorFn: (imageScan: ImageScan) => {
                return (
                  <HeadlampLink
                    routeName={RoutingPath.KubescapeSBOMDetails}
                    params={{
                      name: imageScan.manifestName,
                    }}
                  >
                    SBOM
                  </HeadlampLink>
                );
              },
              gridTemplate: 'min-content',
            },
          ]}
        />
      </SectionBox>
    </>
  );
}

function resultStack(imageScan: ImageScan) {
  function box(color: string, severity: string) {
    return (
      <Box
        sx={{
          borderLeft: 2,
          borderTop: 1,
          borderRight: 1,
          borderBottom: 1,
          borderColor: `gray gray gray ${color}`,
          textAlign: 'center',
          width: 25,
        }}
      >
        <Tooltip title={cveList(imageScan, severity)}>
          {imageScan.matches.filter(match => match.vulnerability.severity === severity).length}
        </Tooltip>
      </Box>
    );
  }

  return (
    <Stack direction="row" spacing={1}>
      {box('purple', 'Critical')}
      {box('red', 'High')}
      {box('orange', 'Medium')}
      {box('yellow', 'Low')}
    </Stack>
  );
}

function cveList(imageScan: ImageScan, severity: string) {
  const cves = imageScan.matches
    .filter(match => match.vulnerability.severity === severity)
    .map(match => match.vulnerability.id);

  if (cves.length > 0) {
    return (
      <>
        <div style={{ fontSize: 'smaller' }}>{severity}</div>
        <br />
        <div style={{ whiteSpace: 'normal', textAlign: 'left', fontSize: 'small' }}>
          <Stack spacing={1}>
            {cves.map(cve => (
              <div>{cve} </div>
            ))}
          </Stack>
        </div>
      </>
    );
  }
}

function getImageScans(workloadScans: WorkloadScan[]): ImageScan[] {
  const imageScans = new Map<string, ImageScan>();

  workloadScans.map(w => {
    if (w.imageScan) imageScans.set(w.imageScan.manifestName, w.imageScan);
  });

  return Array.from(imageScans.values());
}
