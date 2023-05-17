import Chart from 'chart.js';
import { ChartDataSets, ChartOptions, ChartType, PluginServiceRegistrationOptions, TimeScale } from 'chart.js';
import { AfterViewInit, Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonService } from 'src/app/core/services/common/common.service';
import { RbacService } from 'src/app/core/services/rbac-service.service';
import { WrapperService } from 'src/app/core/services/wrapper.service';
import { buildQuery, parseRbacFilter, parseTimeSeriesQuery } from 'src/app/utilities/QueryBuilder';
import { config } from 'src/app/views/teacher-attendance/config/teacher_attendance_config';
import { TeacherAttendanceSummaryComponent } from '../../teacher-attendance-summary.component';
import { ReportDrilldownService } from 'src/app/core/services/report-drilldown/report-drilldown.service';
import _ from "lodash";

interface TrendlineChartDataSets extends ChartDataSets {
  trendlineLinear?: PluginServiceRegistrationOptions;
}

@Component({
  selector: 'app-tas-trendline-chart',
  templateUrl: './tas-trendline-chart.component.html',
  styleUrls: ['./tas-trendline-chart.component.scss']
})
export class TasTrendlineChartComponent implements OnInit {
  reportName: string = 'tas_trendline_chart';
  filters: any = [];
  levels: any;
  tableReportData: any
  minDate: any;
  maxDate: any;
  compareDateRange: any = 30;
  // level = environment.config === 'NVSK' ? 'VSK' : 'district';
  filterIndex: any;
  rbacDetails: any;
  title: any = "Rank in % Teachers Present"

  @Output() exportDates = new EventEmitter<any>();
  @Input() startDate: any;
  @Input() endDate: any;
  @Input() chartConfig: any = {};
  constructor(private readonly _commonService: CommonService,
    private readonly _wrapperService: WrapperService, private _rbacService: RbacService, private readonly _reportDrilldownService: ReportDrilldownService) {
    this._rbacService.getRbacDetails().subscribe((rbacDetails: any) => {
      this.rbacDetails = rbacDetails;
    })

    this._reportDrilldownService.drilldownData.subscribe(data => {
      if (data && data.hierarchyLevel) {
        this.drilldownData(data);
      }
    })
  }

  ngOnInit() {
    // this.generateChart();
  }

  getReportData(startDate = undefined, endDate = undefined): void {
    this.startDate = startDate;
    this.endDate = endDate;
    let reportConfig = config

    let { timeSeriesQueries, queries, levels, label, defaultLevel, filters, options } = reportConfig[this.reportName];
    let onLoadQuery;
    if (this.rbacDetails?.role) {
      filters.every((filter: any) => {
        if (Number(this.rbacDetails?.role) === Number(filter.hierarchyLevel)) {
          queries = { ...filter?.actions?.queries }
          timeSeriesQueries = { ...filter?.timeSeriesQueries }
          Object.keys(queries).forEach((key) => {
            queries[key] = this.parseRbacFilter(queries[key])
            timeSeriesQueries[key] = this.parseRbacFilter(timeSeriesQueries[key])
          });
          return false
        }
        return true
      })
    }

    Object.keys(queries).forEach((key: any) => {
      if (key.toLowerCase().includes('comparison')) {
        let endDate = new Date();
        let days = endDate.getDate() - this.compareDateRange;
        let startDate = new Date();
        startDate.setDate(days)
        onLoadQuery = parseTimeSeriesQuery(queries[key], startDate.toISOString().split('T')[0], endDate.toISOString().split('T')[0])
      }
      else if (this.startDate !== undefined && this.endDate !== undefined && Object.keys(timeSeriesQueries).length > 0) {
        onLoadQuery = parseTimeSeriesQuery(timeSeriesQueries[key], this.startDate, this.endDate)
      }
      else {
        onLoadQuery = queries[key]
      }
      let query = buildQuery(onLoadQuery, defaultLevel, this.levels, this.filters, this.startDate, this.endDate, key, this.compareDateRange);

      if (query && key === 'table') {
        this.getTableReportData(query, options);
      }
    })
  }

  parseRbacFilter(query: string) {
    let newQuery = query;
    let startIndex = newQuery?.indexOf('{');
    let endIndex = newQuery?.indexOf('}');

    if (newQuery && startIndex > -1) {
      let propertyName = query.substring(startIndex + 1, endIndex);
      let re = new RegExp(`{${propertyName}}`, "g");
      Object.keys(this.rbacDetails).forEach((key: any) => {
        if (propertyName === key + '_id') {
          newQuery = newQuery.replace(re, '\'' + this.rbacDetails[key] + '\'');
        }
      });
    }
    return newQuery
  }

  getTableReportData(query, options): void {
    this._commonService.getReportDataNew(query).subscribe((res: any) => {
      let rows = res;
      let { table: { columns } } = options;
      this.tableReportData = {
        data: rows.map(row => {
          if (this.minDate !== undefined && this.maxDate !== undefined) {
            if (row['min_date'] < this.minDate) {
              this.minDate = row['min_date']
            }
            if (row['max_date'] > this.maxDate) {
              this.maxDate = row['max_date']
            }
          }
          else {
            this.minDate = row['min_date']
            this.maxDate = row['max_date']
          }
          columns.forEach((col: any) => {
            if (row[col.property]) {
              row = {
                ...row,
                [col.property]: { value: row[col.property] }
              }
            }
          });
          return row
        }),
        columns: columns.filter(col => {
          if (rows[0] && col.property in rows[0]) {
            return col;
          }
        })
      }
      if (this.tableReportData?.data?.length > 0) {
        let reportsData = { reportData: this.tableReportData.data, reportType: 'table', reportName: this.title }
        // this.csv.csvDownload(reportsData)
        this.generateChart(this.tableReportData)
      }
    });
  }

  async drilldownData(event: any) {
    let { hierarchyLevel, id } = event ?? {}
    let drillDownDetails;

    switch (Number(hierarchyLevel)) {
      case 1:
        drillDownDetails = {
          ...this.rbacDetails,
          state: id
        }
        break;
      case 2:
        drillDownDetails = {
          ...this.rbacDetails,
          district: id
        }
        break;
      case 3:
        drillDownDetails = {
          ...this.rbacDetails,
          block: id
        }
        break;
      case 4:
        drillDownDetails = {
          ...this.rbacDetails,
          cluster: id
        }
        break;
    }

    let reportConfig = config;

    let { timeSeriesQueries, queries, levels, label, defaultLevel, filters, options } = reportConfig[this.reportName];
    let onLoadQuery;
    if (this.rbacDetails?.role) {
      filters.every((filter: any) => {
        if (Number(hierarchyLevel) === Number(filter.hierarchyLevel)) {
          queries = { ...filter?.actions?.queries }
          timeSeriesQueries = { ...filter?.timeSeriesQueries }
          Object.keys(queries).forEach((key) => {
            queries[key] = parseRbacFilter(queries[key], drillDownDetails)
            timeSeriesQueries[key] = parseRbacFilter(timeSeriesQueries[key], drillDownDetails)
          });
          return false
        }
        return true
      })
    } else {
      this._wrapperService.constructFilters(this.filters, filters);
    }

    Object.keys(queries).forEach((key: any) => {
      if (key.toLowerCase().includes('comparison')) {
        let endDate = new Date();
        let days = endDate.getDate() - this.compareDateRange;
        let startDate = new Date();
        startDate.setDate(days)
        onLoadQuery = parseTimeSeriesQuery(queries[key], startDate.toISOString().split('T')[0], endDate.toISOString().split('T')[0])
      }
      else if (this.startDate !== undefined && this.endDate !== undefined && Object.keys(timeSeriesQueries).length > 0) {
        onLoadQuery = parseTimeSeriesQuery(timeSeriesQueries[key], this.startDate, this.endDate)
      }
      else {
        onLoadQuery = queries[key]
      }
      let query = buildQuery(onLoadQuery, defaultLevel, this.levels, this.filters, this.startDate, this.endDate, key, this.compareDateRange);

      if (query && key === 'table') {
        this.getTableReportData(query, options);
      }
    });
  }

  generateChart(reportData) {
    // const dates = reportData?.data?.map(data => moment(data.stt_avg.value).format('YYYY-MM-DD'));
    const dates = reportData?.data?.map(data => {
      const dateValue = new Date(data.att_date.value);
      return dateValue.toLocaleDateString();
    });
    const values = reportData?.data?.map(data => data.stt_avg.value);
    const ctx = document.getElementById('trendlineChart') as HTMLCanvasElement;
    let defaultOptions = {
      type: 'line',

      data: {
        labels: dates,
        datasets: [
          {
            data: values,
            label: '% Teacher Present',
            borderColor: 'green',
            fill: true,
            lineTension: 0,

            // backgroundColor: 'rgba(0,255,0,0.3)',
          },
        ]
      },
      options: {
        responsive: true,
        title: {
          display: true,
          text: "% Teacher Present",
          fontStyle: "normal",
          fontColor: "#333"
        },
        tooltips: {
          callbacks: {
            label: function (context) {
              // const date = dates[context.datasetIndex];
              const value = context.value
              // return `Date: ${date}/n% Teacher Present: ${value}%`;
              return '% Teacher Present:' + value + '%'
            }
          }
        },
        scales: {
          x: {
            type: 'time',
            time: {
              unit: 'day'
            },
            grid: {
              display: false
            } as TimeScale
          },
          y: {

            suggestedMin: Math.min(...values),
            suggestedMax: Math.max(...values),
            grid: {
              display: false
            }
          }
        } as ChartOptions['scales'],
      },
    };
    defaultOptions = _.merge(defaultOptions, this.chartConfig);
    const chart = new Chart(ctx, defaultOptions);
  }
}
