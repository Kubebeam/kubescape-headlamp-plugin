/* 
  Show vulnerability scan results for a workload. 
*/
import { ApiProxy } from '@kinvolk/headlamp-plugin/lib';
import { NameValueTable, SectionBox, Table } from '@kinvolk/headlamp-plugin/lib/components/common';
import { Link } from '@mui/material';
import React, { useEffect } from 'react';
import { useLocation } from 'react-router';
import makeSeverityLabel from '../common/SeverityLabel';
import { getCVESummary } from './CVESummary';

export default function KubescapeVulnerabilityDetails() {
  const location = useLocation();
  const segments = location.pathname.split('/');

  // The second last segment is the namespace
  const namespace = segments[segments.length - 2];
  // The last segment is the name
  const name = segments[segments.length - 1];

  return <VulnerabilityManifestDetailView name={name} namespace={namespace} />;
}

// Fetch vulnerabilitymanifestsummary and then vulnerabilitymanifest (if available)
export async function fetchVulnerabilityManifest(name, namespace) {
  function getVulnerabilityManifestSummary(): Promise<any> {
    return ApiProxy.request(
      `/apis/spdx.softwarecomposition.kubescape.io/v1beta1/namespaces/${namespace}/vulnerabilitymanifestsummaries/${name}`
    );
  }

  function getVulnerabilityManifest(name): Promise<any> {
    if (name === '') {
      return Promise.resolve();
    }
    return ApiProxy.request(
      `/apis/spdx.softwarecomposition.kubescape.io/v1beta1/namespaces/kubescape/vulnerabilitymanifests/${name}`
    );
  }

  const summary = await getVulnerabilityManifestSummary();
  let allManifest: any = null;
  await getVulnerabilityManifest(summary.spec.vulnerabilitiesRef.all.name)
    .then(result => {
      allManifest = result;
    })
    .catch(error => console.log(error.message));
  let relevantManifest: any = null;
  await getVulnerabilityManifest(summary.spec.vulnerabilitiesRef.relevant.name)
    .then(result => {
      relevantManifest = result;
    })
    .catch(error => console.log(error.message));

  return [summary, allManifest, relevantManifest];
}

function VulnerabilityManifestDetailView(props) {
  const { name, namespace } = props;
  const [summary, setSummary] = React.useState(null);
  const [manifestAll, setManifestAll] = React.useState(null);
  const [manifestRelevant, setManifestRelevant] = React.useState(null);

  useEffect(() => {
    fetchVulnerabilityManifest(name, namespace).then(response => {
      setSummary(response[0]);
      setManifestAll(response[1]);
      setManifestRelevant(response[2]);
    });
  }, []);

  return (
    summary && (
      <>
        <SectionBox title="Vulnerabilities">
          <NameValueTable
            rows={[
              {
                name: 'Workload',
                value: summary.metadata.labels['kubescape.io/workload-name'],
              },
              {
                name: 'Namespace',
                value: summary.metadata.labels['kubescape.io/workload-namespace'],
              },
              {
                name: 'Container',
                value: summary.metadata.labels['kubescape.io/workload-container-name'],
              },
              {
                name: 'Kind',
                value: summary.metadata.labels['kubescape.io/workload-kind'],
              },
              {
                name: 'Image',
                value: summary.metadata.annotations['kubescape.io/image-tag'],
              },
              {
                name: 'Last scan',
                value: summary.metadata.creationTimestamp,
              },
              {
                name: 'Type',
                value: manifestAll?.spec.payload.source.type,
              },
              {
                name: 'CVE',
                value: getCVESummary(summary),
              },
            ]}
          />

          {manifestAll && manifestRelevant && (
            <Matches manifest={manifestAll} relevant={manifestRelevant} />
          )}
          {manifestAll && manifestRelevant == null && (
            <Matches manifest={manifestAll} relevant={null} />
          )}
        </SectionBox>

        {/* <SectionBox title="Summary">
          <pre>{manifestAll ? YAML.stringify(manifestAll) : 'Not found'}</pre>
        </SectionBox>

        <SectionBox title="Manifest Relevant">
          <pre>{manifestRelevant ? YAML.stringify(manifestRelevant) : 'Not found'}</pre>
        </SectionBox> */}
      </>
    )
  );
}

function Matches(props) {
  const { manifest, relevant } = props;
  const results = manifest?.spec.payload.matches;

  if (results) {
    results.sort((a, b) => {
      if (a.vulnerability.severity < b.vulnerability.severity) {
        return -1;
      }
      if (a.vulnerability.severity > b.vulnerability.severity) {
        return 1;
      }
      return 0;
    });
  }

  return (
    <SectionBox title="Findings">
      <Table
        data={results}
        columns={[
          {
            header: 'CVE',
            accessorFn: item => {
              return (
                <Link target="_blank" href={item.vulnerability.dataSource}>
                  {item.vulnerability.id}
                </Link>
              );
            },
            gridTemplate: 'auto',
          },
          {
            header: 'Artifact',
            accessorFn: item => item.artifact.name,
            gridTemplate: 'auto',
          },
          {
            header: 'Version',
            accessorFn: item => item.artifact.version,
            gridTemplate: 'auto',
          },
          {
            header: 'Severity',
            accessorFn: item => makeSeverityLabel(item.vulnerability.severity),
            gridTemplate: 'auto',
          },
          {
            header: 'Relevant',
            accessorFn: item => relevant && isRelevant(relevant, item.vulnerability.id),
            gridTemplate: 'auto',
          },
          {
            header: 'Fix',
            accessorFn: item => item.vulnerability.fix.state,
            gridTemplate: 'auto',
          },
          {
            header: 'Fix in version',
            accessorFn: item =>
              item.vulnerability.fix?.versions && Array.isArray(item.vulnerability.fix?.versions)
                ? item.vulnerability.fix.versions.join(', ')
                : '',
            gridTemplate: 'auto',
          },
          {
            header: 'Description',
            accessorFn: item => item.vulnerability.description? expandableDescription(item.vulnerability.description) : '', 
              // item.vulnerability.description
              //   ? item.vulnerability.description.slice(0, 100) + '...'
              //   : '',
          }, 
        ]}
      />
    </SectionBox>
  );
}

import { Accordion, AccordionSummary, AccordionDetails } from '@mui/material'

function expandableDescription(description: string) {
  return (
      <Accordion  slotProps={{ heading: { component: 'h4' } }}>
        <AccordionSummary
          aria-controls="panel1-content"
          id="panel1-header"
        >
          { description.slice(0, 80) + '...'}
        </AccordionSummary>
        <AccordionDetails>
        { description }
        </AccordionDetails>
      </Accordion>
  )
}

function isRelevant(relevantManifest, id): string {
  const matches: any | undefined = relevantManifest?.spec.payload.matches;

  if (matches) {
    for (const match of matches) {
      if (match.vulnerability.id === id) {
        return 'Yes';
      }
    }
  }
  return '';
}
