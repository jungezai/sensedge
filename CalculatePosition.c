#include <stdio.h>
#include <stdlib.h>
#include "trilateration.h"

#define SIZEOF(x) (sizeof(x)/sizeof(x[0]))


//vec3d anchors[] = { { 0, 0, 0 }, { 10, 0, 0 }, { 10, 10, 0 }, { 0, 10, 0 } };
//int dists[][4] = {
//		{ 0, 10000, 14000, 10000 },
//		{ 1400, 9100, 12700, 9100 },
//		{ 2800, 8200, 11300, 8200 },
//		{ 4243, 7616, 9899, 7616 },
//		{ 5657, 7211, 8485, 7211 },
//		{ 7071, 7071, 7071, 7071 },
//};

int main(int argc, char **argv)
{
	vec3d anchors[] = { { 0, 0, 0 }, { atoi(argv[3]), 0, 0 }, { atoi(argv[3]), atoi(argv[4]), 0 }, { 0, atoi(argv[4]), 0 } };
	int ret;
	vec3d report;
	int i;
	int j;
	long int dists[4];
	float areax,areay;

//	char *p="xxxxxxx";
//        char *f="yyyyyyy";
/*
 	for(j=0;j<argc;j++){
	printf("argv %d %s  ",j,argv[j]);
	}
	printf("argc %d \r\n",argc);
*/	


/*
	if(argc<3) {
	printf("错误：参数数量小于4\r\n");
	return -1;
	} 
*/
	if(argc<6) {
	printf("argument error");
	return -1;
	}
        areax=atof(argv[3]);
	areay=atof(argv[4]);

  	for(i=0;i<4;i++){
	dists[i] = atoi(argv[i+5]);
//	printf("dists[%d]-- %d  ",i,dists[i]);	
	}
//	printf("%f  %f\r\n",areax,areay);


//	for (i = 0; i < SIZEOF(dists); i++) { 
//		printf("dists[%d]: %d %d %d %d\n", i, dists[i][0], dists[i][1], dists[i][2], dists[i][3]);
//                printf("dists[%d]: %d %d %d %d\n", argc+1, dists[0], dists[1], dists[2], dists[3]);
//		ret = GetLocation(&report, 1, anchors, (int *)dists[i]);
		ret = GetLocation(&report, 1, anchors, (int *)dists, argv[1],argv[2],areax,areay);
//		printf("result %d",ret);
//	}

	return 0;
}
