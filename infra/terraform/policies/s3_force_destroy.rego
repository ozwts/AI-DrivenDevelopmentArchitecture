# METADATA
# title: S3 bucket force_destroy must be disabled
# description: S3 buckets should not have force_destroy enabled to prevent accidental data loss
# scope: package
# schemas:
#   - input: schema["terraform-raw"]
# custom:
#   id: CUSTOM-AWS-0002
#   avd_id: CUSTOM-AWS-0002
#   provider: aws
#   service: s3
#   severity: HIGH
#   short_code: s3-no-force-destroy
#   recommended_action: Set force_destroy to false
#   input:
#     selector:
#       - type: terraform-raw
package custom.s3.force_destroy

import rego.v1

deny contains res if {
	some block in input.modules[_].blocks
	block.kind == "resource"
	block.type == "aws_s3_bucket"
	attr := block.attributes.force_destroy
	attr.value == true
	res := result.new(
		sprintf("S3 bucket '%s' has force_destroy enabled, risking accidental data loss", [block.name]),
		attr,
	)
}
